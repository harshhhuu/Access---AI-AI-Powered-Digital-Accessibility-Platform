import os
import hashlib
import asyncio
import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas

router = APIRouter()

HF_URL = "https://router.huggingface.co/v1/chat/completions"
HF_HEADERS = {"Authorization": f"Bearer {os.getenv('HF_API_TOKEN')}"}
HF_MODEL = os.getenv("HF_TEXT_MODEL", "Qwen/Qwen2.5-72B-Instruct:novita")


async def call_hf_simplify(text: str, grade_level: int) -> str:
    """Call a supported chat-completions model on HuggingFace."""
    payload = {
        "model": HF_MODEL,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You rewrite text in plain language. Keep all facts, use short "
                    "sentences, and output only the rewritten text."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"Rewrite this so a Grade {grade_level} student can understand it:\n\n{text}"
                ),
            },
        ],
        "max_tokens": 512,
        "temperature": 0.3,
    }
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(HF_URL, headers=HF_HEADERS, json=payload)

    if r.status_code == 503:
        # HuggingFace free tier — model is loading. Wait and retry.
        await asyncio.sleep(20)
        return await call_hf_simplify(text, grade_level)

    if r.status_code != 200:
        detail = r.text[:300].replace("\n", " ")
        raise HTTPException(status_code=502, detail=f"HuggingFace error: {detail}")

    result = r.json()
    message = result["choices"][0]["message"]
    generated = (message.get("content") or message.get("reasoning_content") or "").strip()
    return generated.strip('"')


@router.post("/simplify", response_model=schemas.SimplifyResponse)
async def simplify(body: schemas.SimplifyRequest, db: Session = Depends(get_db)):
    """
    Takes complex text and rewrites it at a chosen reading level (Grade 3, 5, or 8).

    WHY THIS MATTERS FOR ACCESSIBILITY:
    - Users with cognitive disabilities, dyslexia, or low literacy struggle with
      dense medical, legal, or government documents.
    - This endpoint makes ANY content readable — paste a doctor's report,
      insurance form, or news article and get a plain-language version instantly.

    CACHING: Same text + grade = same result every time, so we cache in PostgreSQL
    to avoid paying for the same HuggingFace call twice.
    """
    if len(body.text) > 5000:
        raise HTTPException(status_code=400, detail="Text exceeds 5000 character limit")

    # Step 1: Check cache
    cache_key = hashlib.sha256(
        f"simplify:{body.grade_level}:{body.text}".encode()
    ).hexdigest()
    cached = db.query(models.APICache).filter(models.APICache.input_hash == cache_key).first()
    if cached:
        return schemas.SimplifyResponse(
            simplified=cached.output_text,
            word_count_before=len(body.text.split()),
            word_count_after=len(cached.output_text.split()),
            cached=True,
        )

    # Step 2: Call HuggingFace Mistral
    simplified_text = await call_hf_simplify(body.text, body.grade_level)

    # Step 3: Save to cache
    db.add(models.APICache(
        input_hash=cache_key,
        endpoint="simplify",
        grade_level=body.grade_level,
        output_text=simplified_text,
    ))
    db.commit()

    return schemas.SimplifyResponse(
        simplified=simplified_text,
        word_count_before=len(body.text.split()),
        word_count_after=len(simplified_text.split()),
        cached=False,
    )
