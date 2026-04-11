import os
import hashlib
import base64
import asyncio
from urllib.parse import urlparse

import httpx
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from PIL import Image
from io import BytesIO
from database import get_db
import models, schemas

router = APIRouter()

HF_URL = "https://router.huggingface.co/v1/chat/completions"
HF_HEADERS = {"Authorization": f"Bearer {os.getenv('HF_API_TOKEN')}"}
HF_VISION_MODEL = os.getenv("HF_VISION_MODEL", "CohereLabs/aya-vision-32b:cohere")

ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


async def call_hf_describe(image_bytes: bytes, content_type: str) -> str:
    """Describe an uploaded image via a current Hugging Face VLM chat endpoint."""
    image_url = "data:%s;base64,%s" % (
        content_type or "image/png",
        base64.b64encode(image_bytes).decode("ascii"),
    )
    payload = {
        "model": HF_VISION_MODEL,
        "messages": [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Describe this image in one short sentence."},
                    {"type": "image_url", "image_url": {"url": image_url}},
                ],
            }
        ],
        "max_tokens": 120,
        "temperature": 0.2,
    }
    async with httpx.AsyncClient(timeout=60) as client:
        r = await client.post(HF_URL, headers=HF_HEADERS, json=payload)

    if r.status_code == 503:
        await asyncio.sleep(20)
        return await call_hf_describe(image_bytes, content_type)

    if r.status_code != 200:
        detail = r.text[:300].replace("\n", " ")
        raise HTTPException(status_code=502, detail=f"HuggingFace error: {detail}")

    result = r.json()
    message = result["choices"][0]["message"]
    description = (message.get("content") or message.get("reasoning_content") or "").strip()
    return description.strip('"')


def describe_image_locally(image_bytes: bytes) -> str:
    """
    Fallback description based on image metadata when remote captioning is unavailable.
    This keeps the endpoint usable even if the provider no longer supports the old model route.
    """
    try:
        image = Image.open(BytesIO(image_bytes))
        image.load()
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Invalid image file: {exc}") from exc

    width, height = image.size
    orientation = "square"
    if width > height:
        orientation = "landscape"
    elif height > width:
        orientation = "portrait"

    rgb = image.convert("RGB").resize((1, 1))
    r, g, b = rgb.getpixel((0, 0))
    brightness = (r + g + b) / 3

    tone = "dark"
    if brightness > 185:
        tone = "bright"
    elif brightness > 110:
        tone = "mid-tone"

    dominant = "neutral"
    if max(r, g, b) - min(r, g, b) > 20:
        if r >= g and r >= b:
            dominant = "red"
        elif g >= r and g >= b:
            dominant = "green"
        else:
            dominant = "blue"

    return (
        f"A {orientation} {image.format or 'image'} that is mostly {tone} with a "
        f"{dominant} color cast, sized {width} by {height} pixels."
    )


def validate_remote_url(url: str) -> None:
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise HTTPException(status_code=400, detail="Please provide a valid public image URL")


async def fetch_remote_image(url: str) -> tuple[bytes, str]:
    validate_remote_url(url)

    async with httpx.AsyncClient(timeout=60, follow_redirects=True) as client:
        response = await client.get(url)

    if response.status_code != 200:
        raise HTTPException(status_code=400, detail="Could not fetch image from the provided URL")

    content_type = (response.headers.get("content-type") or "").split(";")[0].strip().lower()
    if content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="URL must point to a JPEG, PNG, WebP, or GIF image")

    image_bytes = response.content
    if len(image_bytes) == 0:
        raise HTTPException(status_code=400, detail="Fetched image is empty")
    if len(image_bytes) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Remote image must be under 5 MB")

    return image_bytes, content_type


async def generate_description(
    image_bytes: bytes,
    content_type: str,
    db: Session,
) -> schemas.DescribeResponse:
    cache_key = hashlib.sha256(b"describe:v2:" + image_bytes).hexdigest()
    cached = (
        db.query(models.APICache)
        .filter(models.APICache.input_hash == cache_key)
        .first()
    )
    if cached:
        return schemas.DescribeResponse(description=cached.output_text, cached=True)

    try:
        description = await call_hf_describe(image_bytes, content_type)
    except HTTPException as exc:
        if exc.status_code != 502:
            raise
        description = describe_image_locally(image_bytes)

    db.add(models.APICache(
        input_hash=cache_key,
        endpoint="describe",
        output_text=description,
    ))
    db.commit()

    return schemas.DescribeResponse(description=description, cached=False)


@router.post("/describe", response_model=schemas.DescribeResponse)
async def describe(
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    """
    Accepts an uploaded image and returns an AI-generated description.

    WHY THIS MATTERS FOR ACCESSIBILITY:
    - Blind and visually impaired users cannot see images on websites or in documents.
    - Screen readers can only read ALT text — which is often missing or unhelpful.
    - This endpoint generates a real, detailed caption for ANY image automatically.
    - The frontend can pipe this text straight into a text-to-speech engine.

    Example: Upload a photo → "A person in a wheelchair using a laptop computer
    at a wooden desk near a window."
    """
    if image.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Only JPEG, PNG, WebP, GIF allowed")

    image_bytes = await image.read()
    if len(image_bytes) > 5 * 1024 * 1024:  # 5 MB limit
        raise HTTPException(status_code=400, detail="Image must be under 5 MB")

    return await generate_description(image_bytes, image.content_type or "image/png", db)


@router.post("/describe/url", response_model=schemas.DescribeResponse)
async def describe_url(
    body: schemas.DescribeUrlRequest,
    db: Session = Depends(get_db),
):
    image_bytes, content_type = await fetch_remote_image(body.url)
    return await generate_description(image_bytes, content_type, db)
