import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from database import engine, Base
from routers import simplify, describe, voice, sign, auth as auth_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Runs on startup — preloads the sign model so the first WebSocket
    connection doesn't have a 3-second delay loading TF.
    """
    print("AccessAI backend starting...")

    # Pre-warm sign model
    try:
        from ml.sign_model import get_model
        get_model()
        print("Sign language model loaded and ready")
    except Exception as e:
        print(f"Sign model not loaded (place sign_model.h5 in models/): {e}")

    # Create all DB tables
    Base.metadata.create_all(bind=engine)
    print("Database tables ready")

    yield  # server runs here

    print("AccessAI backend shutting down")


app = FastAPI(
    title="AccessAI API",
    version="1.0.0",
    description="AI-powered accessibility platform for users with disabilities",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Add your Vercel frontend URL to FRONTEND_URL in .env before deploying
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",   # Vite dev server
        "http://localhost:3000",   # CRA dev server
        os.getenv("FRONTEND_URL", "https://your-vercel-app.vercel.app"),
    ],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth_router.router,  prefix="/auth", tags=["Auth"])
app.include_router(simplify.router,     prefix="/api",  tags=["Simplify"])
app.include_router(describe.router,     prefix="/api",  tags=["Describe"])
app.include_router(voice.router,        prefix="/api",  tags=["Voice"])
app.include_router(sign.router,         prefix="/api",  tags=["Sign"])


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
def health():
    """
    Ping this before demo to wake Render from sleep (free tier sleeps after 15 min).
    Returns instantly when server is up.
    """
    return {"status": "ok", "message": "AccessAI API is running"}


# ── WebSocket: real-time sign detection ───────────────────────────────────────
@app.websocket("/ws/sign")
async def ws_sign(websocket: WebSocket):
    """
    Receives hand landmark data from the frontend every 200ms.
    Returns predicted sign + confidence in real time.

    Message format IN:  { "landmarks": [63 floats] }
    Message format OUT: { "sign": "hello", "confidence": 0.94 }
    """
    await websocket.accept()
    print("WebSocket client connected")
    try:
        while True:
            data = await websocket.receive_json()

            landmarks = data.get("landmarks", [])
            if len(landmarks) != 63:
                await websocket.send_json({"error": f"Expected 63 landmarks, got {len(landmarks)}"})
                continue

            from ml.sign_model import predict
            result = predict(landmarks)
            await websocket.send_json(result)

    except WebSocketDisconnect:
        print("WebSocket client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")
        try:
            await websocket.send_json({"error": str(e)})
        except Exception:
            pass
