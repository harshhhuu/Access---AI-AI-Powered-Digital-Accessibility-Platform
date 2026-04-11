# AccessAI — Backend

> AI-powered accessibility platform backend built with FastAPI + PostgreSQL + HuggingFace.
> Created for the Disability Hackathon.

---

## What is AccessAI?

AccessAI is a backend API that powers accessibility features for users with disabilities:
- **Simplify** complex text for cognitive/reading disabilities
- **Describe** images for blind/visually impaired users
- **Transcribe** voice for motor-impaired users
- **Detect sign language** in real time for Deaf users

---

## Tech Stack

| Tool | Purpose |
|---|---|
| **FastAPI** | Web framework — fast, async, auto-generates API docs |
| **PostgreSQL** | Database — stores users, preferences, cache, sign logs |
| **SQLAlchemy** | ORM — Python classes mapped to DB tables |
| **Pydantic** | Request/response validation and schemas |
| **HuggingFace Router / Inference Providers** | Runs text, vision, and speech models |
| **python-jose** | JWT token creation and verification |
| **bcrypt** | Secure password hashing |
| **httpx** | Async HTTP client for HuggingFace API calls |
| **TensorFlow / NumPy** | Sign language model inference |
| **python-dotenv** | Loads `.env` environment variables |
| **uvicorn** | ASGI server to run FastAPI |

---

## Installed Dependencies

```
fastapi
uvicorn[standard]
sqlalchemy
psycopg2-binary
python-jose[cryptography]
bcrypt
python-multipart
httpx
python-dotenv
Pillow
numpy
tensorflow
pydantic[email]
```

Install all with:
```bash
pip install -r requirements.txt
```

---

## Folder Structure

```
accessai/backend/
│
├── main.py                  # FastAPI app, CORS, WebSocket /ws/sign
├── database.py              # SQLAlchemy engine + session
├── models.py                # ORM table definitions
├── schemas.py               # Pydantic request/response models
├── auth.py                  # JWT + password utility functions
├── requirements.txt         # All dependencies
├── .env                     # Secret keys (never commit this!)
│
├── routers/
│   ├── auth.py              # POST /auth/register, /auth/login, GET /auth/me
│   ├── simplify.py          # POST /api/simplify
│   ├── describe.py          # POST /api/describe
│   ├── voice.py             # POST /api/voice
│   └── sign.py              # POST /api/sign/predict
│
├── ml/
│   ├── sign_model.py        # Loads TF model, runs prediction
│   └── sign_labels.py       # List of 10 sign labels in correct index order
│
└── models/
    └── sign_model.h5        # ← ML teammate places trained model here
```

---

## Database Schema (PostgreSQL)

### Table: `users`
Stores registered user accounts and their accessibility preferences.
```
id               SERIAL PRIMARY KEY
email            VARCHAR(255) UNIQUE NOT NULL
hashed_password  VARCHAR(255) NOT NULL
created_at       TIMESTAMP DEFAULT NOW()
preferences      JSONB DEFAULT {}
```

### Table: `api_cache`
Caches HuggingFace API responses to avoid duplicate calls and save costs.
```
id           SERIAL PRIMARY KEY
input_hash   VARCHAR(64) UNIQUE     ← SHA-256 of input
endpoint     VARCHAR(50)            ← "simplify" | "describe" | "voice"
grade_level  INT                    ← only for /api/simplify
output_text  TEXT NOT NULL
created_at   TIMESTAMP DEFAULT NOW()
```

### Table: `sign_logs`
Logs every sign prediction for future model retraining.
```
id             SERIAL PRIMARY KEY
user_id        INT REFERENCES users(id)
detected_sign  VARCHAR(100)
confidence     FLOAT
landmark_json  JSONB                ← raw 63-float array
created_at     TIMESTAMP DEFAULT NOW()
```

---

## Features Implemented

### 1. Authentication (`/auth`)
| Method | Endpoint | Description |
|---|---|---|
| POST | `/auth/register` | Create account, returns JWT token |
| POST | `/auth/login` | Login, returns JWT token |
| GET | `/auth/me` | Get current user profile (JWT required) |
| PUT | `/auth/preferences` | Save accessibility preferences (JWT required) |

Passwords are hashed with **bcrypt**. Authentication uses **JWT tokens** (24 hour expiry).

---

### 2. Text Simplifier (`/api/simplify`)
- Takes any complex text (max 5000 chars)
- Rewrites it at Grade 3, 5, or 8 reading level
- Uses a configurable HuggingFace chat model
- Caches results in PostgreSQL (SHA-256 hash key)
- Returns word count before and after

**Who it helps:** Users with cognitive disabilities, dyslexia, or low literacy who struggle with medical, legal, or government documents.

---

### 3. Image Describer (`/api/describe`)
- Accepts an uploaded image (JPEG, PNG, WebP, GIF — max 5MB)
- Returns a detailed AI-generated text description
- Uses a configurable HuggingFace vision model
- Results cached in PostgreSQL

**Who it helps:** Blind and visually impaired users who cannot see images on websites or documents.

---

### 4. Voice Transcriber (`/api/voice`)
- Accepts an audio file (MP3, WAV, OGG, WebM — max 25MB)
- Returns full text transcript
- Uses **OpenAI Whisper Large v3** via HuggingFace
- Supports 99+ languages
- Results cached in PostgreSQL

**Who it helps:** Users with motor disabilities who cannot type, and Deaf users who need audio content transcribed.

---

### 5. Sign Language Detection (`/ws/sign` + `/api/sign/predict`)
- Accepts 63 floats (21 hand keypoints × x,y,z from MediaPipe)
- Returns detected ASL sign + confidence score
- **WebSocket** `/ws/sign` — real-time continuous camera feed
- **HTTP** `/api/sign/predict` — single frame fallback
- Logs all predictions to `sign_logs` table for model retraining

**Who it helps:** Deaf and hard-of-hearing users who communicate via sign language.

---

### 6. Caching System
All HuggingFace API calls are cached in PostgreSQL:
- Input is hashed with **SHA-256**
- On cache hit → instant response, no API call
- On cache miss → call HuggingFace, save result, return response
- Saves API costs and speeds up repeated requests

---

### 7. HuggingFace 503 Retry
HuggingFace free tier cold-starts models (can take 20–30 seconds).
All three AI endpoints automatically retry on 503 errors:
```python
if r.status_code == 503:
    await asyncio.sleep(20)
    return await call_hf(...)  # retry
```

---

## Setup & Running

### Step 1 — Clone and enter folder
```bash
cd accessai/backend
```

### Step 2 — Create and activate virtual environment
```bash
# Create
python -m venv venv

# Activate (Windows)
venv\Scripts\activate

# Activate (Mac/Linux)
source venv/bin/activate
```

### Step 3 — Install dependencies
```bash
pip install -r requirements.txt
pip install "pydantic[email]"
```

### Step 4 — Create `.env` file
Create a file named `.env` in the `backend/` folder:
```dotenv
DATABASE_URL=postgresql://postgres:yourpassword@localhost:5432/accessai
HF_API_TOKEN=hf_your_token_here
HF_TEXT_MODEL=Qwen/Qwen2.5-72B-Instruct:novita
HF_VISION_MODEL=CohereLabs/aya-vision-32b:cohere
SECRET_KEY=your_64_char_random_string
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
```

- `DATABASE_URL` — your local PostgreSQL connection string
- `HF_API_TOKEN` — get free token from https://huggingface.co → Settings → Access Tokens
- `HF_TEXT_MODEL` — chat model used by `/api/simplify`
- `HF_VISION_MODEL` — vision model used by `/api/describe`
- `SECRET_KEY` — generate with: `python -c "import secrets; print(secrets.token_hex(32))"`

### Step 5 — Create PostgreSQL database
Open pgAdmin → right click Databases → Create → name it `accessai`

### Step 6 — Run the server
```bash
uvicorn main:app --reload
```

### Step 7 — Verify it's working
Open browser and visit:
- http://localhost:8000/health → should return `{"status":"ok"}`
- http://localhost:8000/docs → interactive API explorer

Or run the backend smoke test:
```bash
python smoke_test.py
```

---

## API Endpoints Summary

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Server health check |
| POST | `/auth/register` | No | Create new user |
| POST | `/auth/login` | No | Login, get JWT token |
| GET | `/auth/me` | JWT | Get current user |
| PUT | `/auth/preferences` | JWT | Save accessibility settings |
| POST | `/api/simplify` | No | Simplify text (chat model) |
| POST | `/api/describe` | No | Describe image (vision model) |
| POST | `/api/voice` | No | Transcribe audio (Whisper AI) |
| POST | `/api/sign/predict` | No | Predict sign from landmarks |
| WS | `/ws/sign` | No | Real-time sign detection |

---

## Environment Variables

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `HF_API_TOKEN` | HuggingFace API token (free) |
| `HF_TEXT_MODEL` | Hugging Face chat model for `/api/simplify` |
| `HF_VISION_MODEL` | Hugging Face vision model for `/api/describe` |
| `SECRET_KEY` | JWT signing secret (keep private!) |
| `ALGORITHM` | JWT algorithm — always `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Token expiry — `1440` = 24 hours |

---

## Notes for ML Teammate

1. Train your sign language model and export it as `sign_model.h5`
2. Place it inside `backend/models/sign_model.h5`
3. Update `ml/sign_labels.py` with your labels in the exact same order as your model output:
```python
LABELS = ["hello", "yes", "no", "please", "thank you", "sorry", "help", "stop", "good", "bad"]
```
4. Input shape the backend expects: `(1, 63)` — 21 keypoints × (x, y, z)
5. Output: softmax array of 10 values

---

## Important Notes

- Never commit `.env` to GitHub — add it to `.gitignore`
- First HuggingFace call may take 20–30 seconds (model cold start) — this is normal
- Tables are auto-created on server startup via SQLAlchemy
- Visit `/docs` to test all endpoints interactively without writing any code
