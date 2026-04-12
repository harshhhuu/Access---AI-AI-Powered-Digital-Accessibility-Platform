"""
Sign inference microservice — TensorFlow/Keras only. No DB/auth/HF.
"""
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

from ml import sign_model


class PredictRequest(BaseModel):
    landmarks: list[float] = Field(..., description="63 floats: 21 keypoints × (x,y,z)")

    class Config:
        json_schema_extra = {
            "example": {"landmarks": [0.0] * 63},
        }


class PredictResponse(BaseModel):
    sign: str
    confidence: float


@asynccontextmanager
async def lifespan(app: FastAPI):
    print("sign-inference: starting warmup...")
    ok, err = sign_model.warmup()
    app.state.model_ready = ok
    app.state.warmup_error = err
    if ok:
        print("sign-inference: model loaded and ready")
    else:
        print(f"sign-inference: model not loaded (degraded): {err}")
    yield
    print("sign-inference: shutdown")


app = FastAPI(
    title="AccessAI Sign Inference",
    version="1.0.0",
    description="Internal service: hand landmarks → sign label + confidence",
    lifespan=lifespan,
)


@app.get("/health")
def health():
    """
    Orchestration: ok when model is loaded; degraded when .h5 missing or TF error.
    """
    ready = getattr(app.state, "model_ready", False)
    return {
        "status": "ok" if ready else "degraded",
        "model_loaded": ready,
        "service": "sign-inference",
        "message": "Sign model ready" if ready else (getattr(app.state, "warmup_error", None) or "Model not loaded"),
    }


@app.post("/predict", response_model=PredictResponse)
def predict(body: PredictRequest):
    if len(body.landmarks) != 63:
        raise HTTPException(
            status_code=400,
            detail=f"Expected 63 landmark floats, got {len(body.landmarks)}",
        )

    try:
        result = sign_model.predict(body.landmarks)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Sign model error: {e}") from e

    return PredictResponse(**result)
