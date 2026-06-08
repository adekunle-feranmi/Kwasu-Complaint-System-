"""Configuration loaded from environment variables. No hardcoded secrets."""
import os


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "dev-only-change-me")
    JWT_SECRET = os.environ.get("JWT_SECRET", "dev-only-change-me-too")
    JWT_EXP_HOURS = int(os.environ.get("JWT_EXP_HOURS", "12"))

    # Admin registration gate (shared code). Required to create an admin.
    ADMIN_REG_CODE = os.environ.get("ADMIN_REG_CODE", "")

    # Database — set DATABASE_URL in production (Railway/PlanetScale).
    # Format: mysql+pymysql://user:pass@host:port/dbname
    DATABASE_URL = os.environ.get(
        "DATABASE_URL",
        "mysql+pymysql://root:password@localhost:3306/kwasu_complaints",
    )

    # CORS: comma-separated list of allowed frontend origins
    CORS_ORIGINS = os.environ.get(
        "CORS_ORIGINS", "http://localhost:5173"
    ).split(",")

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    @property
    def SQLALCHEMY_DATABASE_URI(self):
        return self.DATABASE_URL
