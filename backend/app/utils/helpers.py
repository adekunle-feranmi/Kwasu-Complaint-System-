"""JWT auth helpers and role-based decorators."""
import os
import jwt
import datetime
from functools import wraps
from flask import request, jsonify, current_app, g
from ..models import User


def make_token(user):
    payload = {
        "uid": user.id,
        "role": user.role,
        "exp": datetime.datetime.utcnow() + datetime.timedelta(
            hours=current_app.config["JWT_EXP_HOURS"]),
        "iat": datetime.datetime.utcnow(),
    }
    return jwt.encode(payload, current_app.config["JWT_SECRET"], algorithm="HS256")


def _decode(token):
    return jwt.decode(token, current_app.config["JWT_SECRET"], algorithms=["HS256"])


def _get_user_from_request():
    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        return None
    token = auth.split(" ", 1)[1].strip()
    try:
        payload = _decode(token)
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None
    return User.query.get(payload.get("uid"))


def login_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = _get_user_from_request()
        if not user:
            return jsonify({"error": "authentication required"}), 401
        g.current_user = user
        return fn(*args, **kwargs)
    return wrapper


def admin_required(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = _get_user_from_request()
        if not user:
            return jsonify({"error": "authentication required"}), 401
        if user.role != "admin":
            return jsonify({"error": "admin access required"}), 403
        g.current_user = user
        return fn(*args, **kwargs)
    return wrapper


def verified_student_required(fn):
    """Only verified students may submit complaints / comment."""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        user = _get_user_from_request()
        if not user:
            return jsonify({"error": "authentication required"}), 401
        if user.role != "student":
            return jsonify({"error": "students only"}), 403
        if not user.profile or user.profile.verification_status != "verified":
            return jsonify({"error": "your profile must be verified first"}), 403
        g.current_user = user
        return fn(*args, **kwargs)
    return wrapper
