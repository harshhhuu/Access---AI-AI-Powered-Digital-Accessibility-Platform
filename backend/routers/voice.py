import os
import hashlib
import asyncio
import httpx
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from database import get_db
import models, schemas

router = APIRouter()

# whisper-large-v3 is most accurate; falls back gracefully on free tier
HF_URL = "https://router.huggingface.co/hf-inference/models/openai/whisper-large-v3"
HF_HEADERS = {"Authorization": f"Bearer {os.getenv('HF_API_TOKEN')}"}

ALLOWED_AUDIO = {"audio/mpeg", "audio/wav", "audio/ogg", "audio/webm",
                 "audio/mp4", "audio/x-wav", "video/webm"}

MAX_RETRIES = 3


async def call_hf_whisper(audio_bytes: bytes, retry: int = 0) -> str:
    """Send raw audio bytes to Whisper on HuggingFace for transcription."""
    async with httpx.AsyncClient(timeout=120) as client:
        r = await client.post(
            HF_URL,
            headers={
                **HF_HEADERS,
                "Content-Type": "audio/wav",   # required — HF rejects without this
            },
            content=audio_bytes,
        )

    # 503 = model cold-starting on free tier — wait and retry
    if r.status_code == 503:
        if retry >= MAX_RETRIES:
            raise HTTPException(status_code=503, detail="Whisper model unavailable after retries")
        wait = 20 + (retry * 10)   # 20s, 30s, 40s
        await asyncio.sleep(wait)
        return await call_hf_whisper(audio_bytes, retry + 1)

    if r.status_code != 200:
        detail = r.text[:300].replace("\n", " ")
        raise HTTPException(status_code=502, detail=f"HuggingFace Whisper error: {detail}")

    result = r.json()

    # Whisper returns: {"text": "the transcribed speech..."}
    # Sometimes returns list — handle both
    if isinstance(result, list):
        return result[0].get("text", "")
    return result.get("text", "")


@router.post("/voice", response_model=schemas.VoiceResponse)
async def voice(
    audio: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Accepts an audio file and returns a text transcript using OpenAI Whisper Large v3.

    WHY THIS MATTERS:
    - Users with motor disabilities (cerebral palsy, ALS, spinal cord injury) cannot type.
    - Voice input lets them control the full AccessAI app hands-free.
    - Supports 99+ languages — works for non-English speakers too.

    Frontend flow:
    1. Record audio via MediaRecorder API (produces webm/ogg blob)
    2. POST the blob here as multipart form-data field named "audio"
    3. Receive { transcript: "what the user said" }
    4. Optionally pipe transcript into /api/simplify
    """
    # Validate content type — accept even if browser sends generic type
    content_type = audio.content_type or ""
    if content_type and content_type not in ALLOWED_AUDIO:
        # Don't hard-block — browsers sometimes send wrong content type for audio blobs
        pass  # allow through, Whisper handles most formats

    audio_bytes = await audio.read()

    if len(audio_bytes) == 0:
        raise HTTPException(status_code=400, detail="Audio file is empty")

    if len(audio_bytes) > 25 * 1024 * 1024:  # 25 MB
        raise HTTPException(status_code=400, detail="Audio must be under 25 MB")

    # Cache check — same audio = same transcript
    cache_key = hashlib.sha256(b"voice:" + audio_bytes).hexdigest()
    cached = (
        db.query(models.APICache)
        .filter(models.APICache.input_hash == cache_key)
        .first()
    )
    if cached:
        return schemas.VoiceResponse(transcript=cached.output_text, cached=True)

    # Transcribe
    transcript = await call_hf_whisper(audio_bytes)

    # Cache result
    db.add(models.APICache(
        input_hash=cache_key,
        endpoint="voice",
        output_text=transcript,
    ))
    db.commit()

    return schemas.VoiceResponse(transcript=transcript, cached=False)
