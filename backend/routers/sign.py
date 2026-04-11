from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
import models, schemas

router = APIRouter()


@router.post("/sign/predict", response_model=schemas.SignPredictResponse)
def sign_predict(body: schemas.SignPredictRequest, db: Session = Depends(get_db)):
    """
    HTTP endpoint for sign language prediction.
    Use WebSocket /ws/sign for real-time continuous detection.

    Input:  { "landmarks": [63 floats] }
            — 21 hand keypoints × (x, y, z), normalised by wrist position
    Output: { "sign": "hello", "confidence": 0.97 }

    WHY:
    - Deaf users communicate via sign language.
    - This converts webcam hand gestures into text that anyone can read.
    - The WebSocket version handles live video; this handles single frames or testing.
    """
    if len(body.landmarks) != 63:
        raise HTTPException(
            status_code=400,
            detail=f"Expected 63 landmark floats, got {len(body.landmarks)}"
        )

    try:
        from ml.sign_model import predict
        result = predict(body.landmarks)
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Sign model error: {str(e)}")

    # Log for future retraining
    db.add(models.SignLog(
        detected_sign=result["sign"],
        confidence=result["confidence"],
        landmark_json=body.landmarks,
    ))
    db.commit()

    return schemas.SignPredictResponse(**result)
