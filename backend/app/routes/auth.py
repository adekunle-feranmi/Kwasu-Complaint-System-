"""Authentication & profile routes."""
import re
from flask import Blueprint, request, jsonify, g, current_app
from werkzeug.security import generate_password_hash, check_password_hash
from .. import db
from ..models import User, Profile, Notification, ActivityLog
from ..utils.helpers import make_token, login_required

auth_bp = Blueprint("auth", __name__)

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _log(user_id, action, detail=""):
    db.session.add(ActivityLog(user_id=user_id, action=action, detail=detail))


@auth_bp.route("/register", methods=["POST"])
def register_student():
    data = request.get_json(force=True) or {}
    email = (data.get("email") or "").strip().lower()
    matric = (data.get("matric_number") or "").strip() or None
    password = data.get("password") or ""

    if not EMAIL_RE.match(email):
        return jsonify({"error": "valid email required"}), 400
    if len(password) < 6:
        return jsonify({"error": "password must be at least 6 characters"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "email already registered"}), 409
    if matric and User.query.filter_by(matric_number=matric).first():
        return jsonify({"error": "matric number already registered"}), 409

    user = User(email=email, matric_number=matric,
                password_hash=generate_password_hash(password), role="student")
    db.session.add(user)
    db.session.commit()
    _log(user.id, "register_student", email)
    db.session.commit()

    return jsonify({"token": make_token(user), "user": _user_json(user)}), 201


@auth_bp.route("/register-admin", methods=["POST"])
def register_admin():
    data = request.get_json(force=True) or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    code = data.get("admin_code") or ""

    required = current_app.config.get("ADMIN_REG_CODE", "")
    if not required:
        return jsonify({"error": "admin registration is disabled "
                                 "(ADMIN_REG_CODE not set on server)"}), 403
    if code != required:
        return jsonify({"error": "invalid admin registration code"}), 403
    if not EMAIL_RE.match(email):
        return jsonify({"error": "valid email required"}), 400
    if len(password) < 6:
        return jsonify({"error": "password must be at least 6 characters"}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "email already registered"}), 409

    user = User(email=email, password_hash=generate_password_hash(password),
                role="admin")
    db.session.add(user)
    db.session.commit()
    _log(user.id, "register_admin", email)
    db.session.commit()
    return jsonify({"token": make_token(user), "user": _user_json(user)}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json(force=True) or {}
    identifier = (data.get("identifier") or "").strip()
    password = data.get("password") or ""

    # identifier may be email or matric number
    if EMAIL_RE.match(identifier.lower()):
        user = User.query.filter_by(email=identifier.lower()).first()
    else:
        user = User.query.filter_by(matric_number=identifier).first()

    if not user or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "invalid credentials"}), 401

    return jsonify({"token": make_token(user), "user": _user_json(user)})


@auth_bp.route("/me", methods=["GET"])
@login_required
def me():
    return jsonify({"user": _user_json(g.current_user)})


@auth_bp.route("/profile", methods=["POST"])
@login_required
def upsert_profile():
    """Create or edit profile. Any edit resets status to 'pending'.
    A banned student cannot resubmit."""
    user = g.current_user
    if user.role != "student":
        return jsonify({"error": "students only"}), 403

    data = request.get_json(force=True) or {}
    full_name = (data.get("full_name") or "").strip()
    if not full_name:
        return jsonify({"error": "full_name required"}), 400

    profile = user.profile
    if profile and profile.verification_status == "banned":
        return jsonify({"error": "this account is banned and cannot resubmit"}), 403

    if not profile:
        profile = Profile(user_id=user.id, full_name=full_name)
        db.session.add(profile)
    else:
        profile.full_name = full_name

    profile.matric_number = (data.get("matric_number") or user.matric_number or "").strip()
    profile.department = (data.get("department") or "").strip()
    profile.level = (data.get("level") or "").strip()
    profile.verification_status = "pending"      # every edit re-enters the queue
    profile.reject_reason = None

    db.session.commit()
    _log(user.id, "profile_submitted", full_name)
    db.session.commit()
    return jsonify({"profile": _profile_json(profile)})


@auth_bp.route("/notifications", methods=["GET"])
@login_required
def notifications():
    items = (Notification.query.filter_by(user_id=g.current_user.id)
             .order_by(Notification.created_at.desc()).all())
    return jsonify({"notifications": [
        {"id": n.id, "message": n.message, "is_read": n.is_read,
         "created_at": n.created_at.isoformat()} for n in items]})


# ---------- serializers ----------
def _user_json(user):
    return {
        "id": user.id, "email": user.email, "role": user.role,
        "matric_number": user.matric_number,
        "profile": _profile_json(user.profile) if user.profile else None,
    }


def _profile_json(p):
    if not p:
        return None
    return {
        "id": p.id, "full_name": p.full_name, "matric_number": p.matric_number,
        "department": p.department, "level": p.level,
        "verification_status": p.verification_status,
        "reject_reason": p.reject_reason,
    }
