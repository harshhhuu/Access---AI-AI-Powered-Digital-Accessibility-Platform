from pydantic import BaseModel, EmailStr
from typing import Dict, Any, List


# ── Auth ──────────────────────────────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserResponse(BaseModel):
    id: int
    email: str
    preferences: Dict[str, Any] = {}

    class Config:
        from_attributes = True

class PreferencesRequest(BaseModel):
    preferences: Dict[str, Any]


# ── Simplify ──────────────────────────────────────────────────────────────────
class SimplifyRequest(BaseModel):
    text: str
    grade_level: int = 5  # 3 | 5 | 8

class SimplifyResponse(BaseModel):
    simplified: str
    word_count_before: int
    word_count_after: int
    cached: bool


# ── Describe ──────────────────────────────────────────────────────────────────
class DescribeResponse(BaseModel):
    description: str
    cached: bool


class DescribeUrlRequest(BaseModel):
    url: str


# ── Voice ─────────────────────────────────────────────────────────────────────
class VoiceResponse(BaseModel):
    transcript: str
    cached: bool


# ── Sign ──────────────────────────────────────────────────────────────────────
class SignPredictRequest(BaseModel):
    landmarks: List[float]   # exactly 63 floats — validated in sign.py

class SignPredictResponse(BaseModel):
    sign: str
    confidence: float
