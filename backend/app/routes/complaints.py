"""Complaint submission, feed, and comments."""
from flask import Blueprint, request, jsonify, g
from .. import db
from ..models import Complaint, Category, AbuseFlag, Comment, ActivityLog
from ..ml.abuse_detector import detect_abuse
from ..ml.predictor import classify
from ..utils.helpers import login_required, verified_student_required

complaints_bp = Blueprint("complaints", __name__)


@complaints_bp.route("", methods=["POST"])
@complaints_bp.route("/", methods=["POST"])
@verified_student_required
def submit():
    data = request.get_json(force=True) or {}
    text = (data.get("text") or "").strip()
    if len(text) < 3:
        return jsonify({"error": "complaint text too short"}), 400

    # 1) abuse detection runs FIRST
    is_abusive, reason = detect_abuse(text)
    if is_abusive:
        c = Complaint(user_id=g.current_user.id, complaint_text=text,
                      is_flagged=True, is_published=False,
                      predicted_category=None)
        db.session.add(c)
        db.session.commit()
        db.session.add(AbuseFlag(complaint_id=c.id, flag_reason=reason))
        db.session.add(ActivityLog(user_id=g.current_user.id,
                                   action="complaint_flagged", detail=reason))
        db.session.commit()
        return jsonify({"status": "flagged",
                        "message": "Your complaint was flagged for review and "
                                   "is awaiting moderation."}), 201

    # 2) clean -> classify
    category_name = classify(text)
    category = Category.query.filter_by(name=category_name).first()

    c = Complaint(user_id=g.current_user.id, complaint_text=text,
                  predicted_category=category_name,
                  category_id=category.id if category else None,
                  status="pending", is_flagged=False, is_published=True)
    db.session.add(c)
    db.session.commit()
    db.session.add(ActivityLog(user_id=g.current_user.id,
                               action="complaint_submitted", detail=category_name))
    db.session.commit()
    return jsonify({"status": "published", "complaint": _complaint_json(c)}), 201


@complaints_bp.route("/feed", methods=["GET"])
@login_required
def feed():
    """All logged-in users see the published feed (verified or not)."""
    items = (Complaint.query
             .filter_by(is_published=True, is_flagged=False)
             .order_by(Complaint.created_at.desc()).all())
    return jsonify({"complaints": [_complaint_json(c, include_comments=True)
                                   for c in items]})


@complaints_bp.route("/mine", methods=["GET"])
@login_required
def mine():
    items = (Complaint.query.filter_by(user_id=g.current_user.id)
             .order_by(Complaint.created_at.desc()).all())
    return jsonify({"complaints": [_complaint_json(c) for c in items]})


@complaints_bp.route("/<int:cid>/comments", methods=["POST"])
@verified_student_required
def add_comment(cid):
    c = Complaint.query.get_or_404(cid)
    if not c.is_published:
        return jsonify({"error": "cannot comment on this complaint"}), 403
    data = request.get_json(force=True) or {}
    text = (data.get("text") or "").strip()
    if not text:
        return jsonify({"error": "comment text required"}), 400
    cm = Comment(complaint_id=cid, user_id=g.current_user.id, comment_text=text)
    db.session.add(cm)
    db.session.commit()
    return jsonify({"comment": _comment_json(cm)}), 201


# ---------- serializers ----------
def _complaint_json(c, include_comments=False):
    res = c.resolutions[-1].response_text if c.resolutions else None
    out = {
        "id": c.id,
        "text": c.complaint_text,
        "category": c.predicted_category,
        "status": c.status,
        "is_flagged": c.is_flagged,
        "is_published": c.is_published,
        "response": res,
        "created_at": c.created_at.isoformat(),
        "author": (c.user.profile.full_name
                   if c.user and c.user.profile else "Student"),
    }
    if include_comments:
        out["comments"] = [_comment_json(cm) for cm in c.comments]
    return out


def _comment_json(cm):
    return {
        "id": cm.id,
        "text": cm.comment_text,
        "author": (cm.user.profile.full_name
                   if cm.user and cm.user.profile else "Student"),
        "created_at": cm.created_at.isoformat(),
    }
