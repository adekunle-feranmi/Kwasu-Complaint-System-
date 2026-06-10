"""Admin routes: profile verification + complaint management + stats."""
from datetime import datetime, timedelta
from flask import Blueprint, request, jsonify, g
from sqlalchemy import func
from .. import db
from ..models import (User, Profile, Complaint, Category, Resolution,
                      AbuseFlag, Notification, ActivityLog)
from ..utils.helpers import admin_required

admin_bp = Blueprint("admin", __name__)


def _notify(user_id, message):
    db.session.add(Notification(user_id=user_id, message=message))


def _log(action, detail=""):
    db.session.add(ActivityLog(user_id=g.current_user.id, action=action, detail=detail))


# ============ SECTION 1: PROFILE MANAGEMENT ============

@admin_bp.route("/profiles/pending", methods=["GET"])
@admin_required
def pending_profiles():
    items = (Profile.query.filter_by(verification_status="pending")
             .order_by(Profile.updated_at.asc()).all())
    return jsonify({"profiles": [_profile_json(p) for p in items]})


@admin_bp.route("/profiles/<int:pid>/id-image", methods=["GET"])
@admin_required
def profile_id_image(pid):
    """Serve the pending ID image for admin review."""
    from flask import Response
    p = Profile.query.get_or_404(pid)
    if not p.id_image:
        return jsonify({"error": "no ID image on file"}), 404
    return Response(p.id_image, mimetype=p.id_image_mime or "image/jpeg")


@admin_bp.route("/profiles/<int:pid>/approve", methods=["POST"])
@admin_required
def approve_profile(pid):
    p = Profile.query.get_or_404(pid)
    p.verification_status = "verified"
    p.reject_reason = None
    # ID image is no longer needed once a decision is made — clear it.
    p.id_image = None
    p.id_image_mime = None
    _notify(p.user_id, "Your profile has been approved. You can now submit "
                       "and comment on complaints.")
    _log("profile_approved", str(pid))
    db.session.commit()
    return jsonify({"profile": _profile_json(p)})


@admin_bp.route("/profiles/<int:pid>/reject", methods=["POST"])
@admin_required
def reject_profile(pid):
    data = request.get_json(force=True) or {}
    reason = (data.get("reason") or "").strip() or "No reason provided."
    p = Profile.query.get_or_404(pid)
    p.verification_status = "rejected"
    p.reject_reason = reason
    # Clear the ID image on decision.
    p.id_image = None
    p.id_image_mime = None
    _notify(p.user_id, f"Your profile was rejected: {reason} "
                       f"You may edit and resubmit.")
    _log("profile_rejected", f"{pid}: {reason}")
    db.session.commit()
    return jsonify({"profile": _profile_json(p)})


@admin_bp.route("/profiles/<int:pid>/ban", methods=["POST"])
@admin_required
def ban_profile(pid):
    p = Profile.query.get_or_404(pid)
    p.verification_status = "banned"
    p.id_image = None
    p.id_image_mime = None
    _notify(p.user_id, "Your account has been banned. You can no longer "
                       "submit complaints.")
    _log("profile_banned", str(pid))
    db.session.commit()
    return jsonify({"profile": _profile_json(p)})


# ============ SECTION 2: COMPLAINT MANAGEMENT ============

@admin_bp.route("/complaints", methods=["GET"])
@admin_required
def complaint_queue():
    items = (Complaint.query.filter_by(is_flagged=False)
             .order_by(Complaint.created_at.desc()).all())
    return jsonify({"complaints": [_complaint_json(c) for c in items]})


@admin_bp.route("/complaints/flagged", methods=["GET"])
@admin_required
def flagged_queue():
    items = (Complaint.query.filter_by(is_flagged=True)
             .order_by(Complaint.created_at.desc()).all())
    return jsonify({"complaints": [_complaint_json(c, with_flag=True)
                                   for c in items]})


@admin_bp.route("/complaints/<int:cid>/category", methods=["POST"])
@admin_required
def change_category(cid):
    data = request.get_json(force=True) or {}
    name = (data.get("category") or "").strip()
    cat = Category.query.filter_by(name=name).first()
    if not cat:
        return jsonify({"error": "category must be Academic or Administrative"}), 400
    c = Complaint.query.get_or_404(cid)
    c.predicted_category = name
    c.category_id = cat.id
    _log("category_changed", f"{cid} -> {name}")
    db.session.commit()
    return jsonify({"complaint": _complaint_json(c)})


@admin_bp.route("/complaints/<int:cid>/status", methods=["POST"])
@admin_required
def change_status(cid):
    data = request.get_json(force=True) or {}
    status = (data.get("status") or "").strip()
    if status not in ("pending", "in_progress", "resolved"):
        return jsonify({"error": "invalid status"}), 400
    c = Complaint.query.get_or_404(cid)
    c.status = status
    _log("status_changed", f"{cid} -> {status}")
    db.session.commit()
    return jsonify({"complaint": _complaint_json(c)})


@admin_bp.route("/complaints/<int:cid>/respond", methods=["POST"])
@admin_required
def respond(cid):
    data = request.get_json(force=True) or {}
    text = (data.get("response") or "").strip()
    if not text:
        return jsonify({"error": "response text required"}), 400
    c = Complaint.query.get_or_404(cid)
    db.session.add(Resolution(complaint_id=cid, admin_id=g.current_user.id,
                              response_text=text))
    _notify(c.user_id, "An admin responded to your complaint.")
    _log("complaint_responded", str(cid))
    db.session.commit()
    return jsonify({"complaint": _complaint_json(c)})


@admin_bp.route("/complaints/<int:cid>/clear-flag", methods=["POST"])
@admin_required
def clear_flag(cid):
    """False positive: publish the complaint and classify it now."""
    from ..ml.predictor import classify
    c = Complaint.query.get_or_404(cid)
    flag = AbuseFlag.query.filter_by(complaint_id=cid).first()
    if flag:
        flag.review_status = "cleared"
        flag.reviewed_by = g.current_user.id
    name = classify(c.complaint_text)
    cat = Category.query.filter_by(name=name).first()
    c.is_flagged = False
    c.is_published = True
    c.predicted_category = name
    c.category_id = cat.id if cat else None
    _notify(c.user_id, "Your complaint was reviewed and published.")
    _log("flag_cleared", str(cid))
    db.session.commit()
    return jsonify({"complaint": _complaint_json(c)})


@admin_bp.route("/complaints/<int:cid>/confirm-flag", methods=["POST"])
@admin_required
def confirm_flag(cid):
    """Confirm abuse: stays unpublished, student is warned/noted."""
    c = Complaint.query.get_or_404(cid)
    flag = AbuseFlag.query.filter_by(complaint_id=cid).first()
    if flag:
        flag.review_status = "confirmed"
        flag.reviewed_by = g.current_user.id
    _notify(c.user_id, "Your complaint was found to contain abusive content "
                       "and was not published. Please observe community rules.")
    _log("flag_confirmed", str(cid))
    db.session.commit()
    return jsonify({"complaint": _complaint_json(c, with_flag=True)})


# ============ SUMMARY STATS ============

@admin_bp.route("/stats", methods=["GET"])
@admin_required
def stats():
    by_cat = dict(db.session.query(
        Complaint.predicted_category, func.count(Complaint.id))
        .filter(Complaint.is_flagged.is_(False))
        .group_by(Complaint.predicted_category).all())

    # last 7 days trend
    today = datetime.utcnow().date()
    trend = []
    for i in range(6, -1, -1):
        day = today - timedelta(days=i)
        start = datetime(day.year, day.month, day.day)
        end = start + timedelta(days=1)
        n = (Complaint.query
             .filter(Complaint.created_at >= start, Complaint.created_at < end)
             .count())
        trend.append({"date": day.isoformat(), "count": n})

    return jsonify({
        "by_category": {
            "Academic": by_cat.get("Academic", 0),
            "Administrative": by_cat.get("Administrative", 0),
        },
        "totals": {
            "complaints": Complaint.query.filter_by(is_flagged=False).count(),
            "flagged": Complaint.query.filter_by(is_flagged=True).count(),
            "pending_profiles": Profile.query.filter_by(
                verification_status="pending").count(),
        },
        "trend_7_days": trend,
    })


# ---------- serializers ----------
def _profile_json(p):
    u = User.query.get(p.user_id)
    return {
        "id": p.id, "user_id": p.user_id,
        "email": u.email if u else None,
        "full_name": p.full_name, "matric_number": p.matric_number,
        "department": p.department, "level": p.level,
        "verification_status": p.verification_status,
        "reject_reason": p.reject_reason,
        "ocr_match": p.ocr_match,
        "ocr_matric_text": p.ocr_matric_text,
        "has_id_image": bool(p.id_image),
    }


def _complaint_json(c, with_flag=False):
    res = c.resolutions[-1].response_text if c.resolutions else None
    out = {
        "id": c.id, "text": c.complaint_text,
        "category": c.predicted_category, "status": c.status,
        "is_flagged": c.is_flagged, "is_published": c.is_published,
        "response": res, "created_at": c.created_at.isoformat(),
        "author": (c.user.profile.full_name
                   if c.user and c.user.profile else "Student"),
        "comments": [
            {"id": cm.id, "text": cm.comment_text,
             "author": (cm.user.profile.full_name
                        if cm.user and cm.user.profile else "Admin")}
            for cm in c.comments
        ],
    }
    if with_flag:
        flag = AbuseFlag.query.filter_by(complaint_id=c.id).first()
        out["flag_reason"] = flag.flag_reason if flag else None
        out["review_status"] = flag.review_status if flag else None
    return out
