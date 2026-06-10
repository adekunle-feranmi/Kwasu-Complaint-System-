"""SQLAlchemy models — mirror database/schema.sql."""
from datetime import datetime
from . import db


class User(db.Model):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    matric_number = db.Column(db.String(50), unique=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum("student", "admin"), default="student", nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    profile = db.relationship("Profile", uselist=False, backref="user",
                              cascade="all, delete-orphan")


class Profile(db.Model):
    __tablename__ = "profiles"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), unique=True, nullable=False)
    full_name = db.Column(db.String(255), nullable=False)
    matric_number = db.Column(db.String(50))
    department = db.Column(db.String(255))
    level = db.Column(db.String(20))
    verification_status = db.Column(
        db.Enum("pending", "verified", "rejected", "banned"),
        default="pending", nullable=False)
    reject_reason = db.Column(db.Text)
    # ID image held only while pending; cleared on admin decision.
    id_image = db.Column(db.LargeBinary(length=(2**24 - 1)))   # MEDIUMBLOB
    id_image_mime = db.Column(db.String(64))
    # OCR cross-check of typed matric vs matric read from the ID image.
    ocr_matric_text = db.Column(db.String(255))
    ocr_match = db.Column(db.String(20))   # 'match' | 'mismatch' | 'unreadable' | 'unavailable'
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class Category(db.Model):
    __tablename__ = "categories"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(50), unique=True, nullable=False)


class Complaint(db.Model):
    __tablename__ = "complaints"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    complaint_text = db.Column(db.Text, nullable=False)
    predicted_category = db.Column(db.String(50))
    category_id = db.Column(db.Integer, db.ForeignKey("categories.id"))
    status = db.Column(db.Enum("pending", "in_progress", "resolved"),
                       default="pending", nullable=False)
    is_flagged = db.Column(db.Boolean, default=False, nullable=False)
    is_published = db.Column(db.Boolean, default=True, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = db.relationship("User", backref="complaints")
    resolutions = db.relationship("Resolution", backref="complaint",
                                  cascade="all, delete-orphan")
    comments = db.relationship("Comment", backref="complaint",
                               cascade="all, delete-orphan")
    abuse_flags = db.relationship("AbuseFlag", backref="complaint",
                                  cascade="all, delete-orphan")


class Resolution(db.Model):
    __tablename__ = "resolutions"
    id = db.Column(db.Integer, primary_key=True)
    complaint_id = db.Column(db.Integer, db.ForeignKey("complaints.id"), nullable=False)
    admin_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    response_text = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Comment(db.Model):
    __tablename__ = "comments"
    id = db.Column(db.Integer, primary_key=True)
    complaint_id = db.Column(db.Integer, db.ForeignKey("complaints.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    comment_text = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    user = db.relationship("User")


class AbuseFlag(db.Model):
    __tablename__ = "abuse_flags"
    id = db.Column(db.Integer, primary_key=True)
    complaint_id = db.Column(db.Integer, db.ForeignKey("complaints.id"), nullable=False)
    flag_reason = db.Column(db.Text)
    review_status = db.Column(db.Enum("pending", "cleared", "confirmed"),
                              default="pending", nullable=False)
    reviewed_by = db.Column(db.Integer, db.ForeignKey("users.id"))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Notification(db.Model):
    __tablename__ = "notifications"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    message = db.Column(db.Text, nullable=False)
    is_read = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class ActivityLog(db.Model):
    __tablename__ = "activity_logs"
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))
    action = db.Column(db.String(255), nullable=False)
    detail = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
