import json
import sys
import uuid
import wave
from pathlib import Path
from io import BytesIO

from fastapi.testclient import TestClient
from PIL import Image

ROOT = Path(__file__).resolve().parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from main import app


def print_result(name: str, response) -> None:
    try:
        body = response.json()
    except Exception:
        body = response.text
    print(f"{name} -> {response.status_code}")
    print(json.dumps(body, indent=2) if isinstance(body, (dict, list)) else body)
    print()


def main() -> None:
    email = f"smoke_{uuid.uuid4().hex[:8]}@example.com"
    password = "Passw0rd!"
    headers = {}

    png_buffer = BytesIO()
    Image.new("RGB", (8, 8), color=(40, 120, 220)).save(png_buffer, format="PNG")
    png_bytes = png_buffer.getvalue()
    wav_buffer = BytesIO()
    with wave.open(wav_buffer, "wb") as wav_file:
        wav_file.setnchannels(1)
        wav_file.setsampwidth(2)
        wav_file.setframerate(16000)
        wav_file.writeframes(b"\x00\x00" * 16000)
    wav_bytes = wav_buffer.getvalue()

    with TestClient(app, raise_server_exceptions=False) as client:
        register = client.post("/auth/register", json={"email": email, "password": password})
        print_result("POST /auth/register", register)
        try:
            token = register.json().get("access_token")
        except Exception:
            token = None
        if token:
            headers = {"Authorization": f"Bearer {token}"}

        checks = [
            ("GET /health", client.get("/health")),
            ("POST /auth/login", client.post("/auth/login", json={"email": email, "password": password})),
            ("GET /auth/me", client.get("/auth/me", headers=headers)),
            (
                "PUT /auth/preferences",
                client.put(
                    "/auth/preferences",
                    json={"preferences": {"contrast": "high", "font_size": "large"}},
                    headers=headers,
                ),
            ),
            ("POST /api/sign/predict", client.post("/api/sign/predict", json={"landmarks": [0.0] * 63})),
            (
                "POST /api/simplify",
                client.post(
                    "/api/simplify",
                    json={
                        "text": "The patient should remain ambulatory as tolerated following the procedure.",
                        "grade_level": 5,
                    },
                ),
            ),
            (
                "POST /api/describe",
                client.post("/api/describe", files={"image": ("tiny.png", png_bytes, "image/png")}),
            ),
            (
                "POST /api/describe/url",
                client.post(
                    "/api/describe/url",
                    json={
                        "url": "https://huggingface.co/datasets/huggingface/documentation-images/resolve/main/coco_sample.png"
                    },
                ),
            ),
            (
                "POST /api/voice",
                client.post("/api/voice", files={"audio": ("tiny.wav", wav_bytes, "audio/wav")}),
            ),
        ]

        for name, response in checks:
            print_result(name, response)


if __name__ == "__main__":
    main()
