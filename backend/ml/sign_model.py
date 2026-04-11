"""
ML integration layer used by both /api/sign/predict and /ws/sign.
Place sign_model.h5 in the backend/models folder before running the server.
"""
import os

import numpy as np

_model = None


def get_model():
    """Lazy-load the Keras model once on first prediction call."""
    global _model
    if _model is None:
        try:
            import tensorflow as tf

            model_path = os.path.join(os.path.dirname(__file__), "..", "models", "sign_model.h5")
            model_path = os.path.abspath(model_path)

            if not os.path.exists(model_path):
                raise FileNotFoundError(
                    f"sign_model.h5 not found at: {model_path}\n"
                    "Place the trained model file in the models/ folder."
                )

            _model = tf.keras.models.load_model(model_path)
            print(f"Sign model loaded from {model_path}")
        except Exception as error:
            raise RuntimeError(f"Could not load sign model: {error}")
    return _model


def predict(landmarks: list) -> dict:
    """
    Run inference on 63 hand landmark floats.

    Args:
        landmarks: List of 63 floats (21 keypoints x, y, z) normalized by wrist position.

    Returns:
        {"sign": "hello", "confidence": 0.97}
    """
    from ml.sign_labels import LABELS

    if len(landmarks) != 63:
        raise ValueError(f"Expected 63 landmarks, got {len(landmarks)}")

    arr = np.array(landmarks, dtype=np.float32).reshape(1, 63)
    probs = get_model().predict(arr, verbose=0)[0]

    idx = int(np.argmax(probs))
    confidence = round(float(probs[idx]), 3)

    return {
        "sign": LABELS[idx],
        "confidence": confidence,
    }
