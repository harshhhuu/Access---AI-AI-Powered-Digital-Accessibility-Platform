from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.sql import func
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # Stores: { "font_size": "large", "contrast": "high", "voice_speed": 1.2 }
    preferences = Column(JSONB, default={})


class APICache(Base):
    __tablename__ = "api_cache"

    id = Column(Integer, primary_key=True, index=True)
    input_hash = Column(String(64), unique=True, nullable=False, index=True)
    endpoint = Column(String(50), nullable=False)   # "simplify" | "describe" | "voice"
    grade_level = Column(Integer, nullable=True)     # Only for /api/simplify
    output_text = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class SignLog(Base):
    __tablename__ = "sign_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    detected_sign = Column(String(100))             # e.g. "hello"
    confidence = Column(Float)                       # 0.0 – 1.0
    landmark_json = Column(JSONB)                    # Raw 63-float array for retraining
    created_at = Column(DateTime(timezone=True), server_default=func.now())