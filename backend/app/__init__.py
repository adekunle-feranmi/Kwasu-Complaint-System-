"""Flask application factory."""
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

db = SQLAlchemy()


def create_app():
    from config import Config
    cfg = Config()

    app = Flask(__name__)
    app.config["SECRET_KEY"] = cfg.SECRET_KEY
    app.config["JWT_SECRET"] = cfg.JWT_SECRET
    app.config["JWT_EXP_HOURS"] = cfg.JWT_EXP_HOURS
    app.config["ADMIN_REG_CODE"] = cfg.ADMIN_REG_CODE
    app.config["SQLALCHEMY_DATABASE_URI"] = cfg.DATABASE_URL
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

    db.init_app(app)
    CORS(app, origins=cfg.CORS_ORIGINS, supports_credentials=True)

    from .routes.auth import auth_bp
    from .routes.complaints import complaints_bp
    from .routes.admin import admin_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(complaints_bp, url_prefix="/api/complaints")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")

    @app.route("/api/health")
    def health():
        from .ml.predictor import model_info
        return {"status": "ok", "model": model_info()}

    with app.app_context():
        db.create_all()
        _seed_categories()

    return app


def _seed_categories():
    from .models import Category
    for name in ("Academic", "Administrative"):
        if not Category.query.filter_by(name=name).first():
            db.session.add(Category(name=name))
    db.session.commit()
