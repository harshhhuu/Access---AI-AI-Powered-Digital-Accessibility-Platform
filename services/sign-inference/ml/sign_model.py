"""
ML integration for sign-inference service.
Place sign_model.h5 in services/sign-inference/models/ (or set MODEL_PATH).
"""
import os

import numpy as np

_model = None
_load_error: str | None = None


def _model_path() -> str:
    override = os.getenv("MODEL_PATH")
    if override:
        return os.path.abspath(override)
    base = os.path.join(os.path.dirname(__file__), "..", "models", "sign_model.h5")
    return os.path.abspath(base)


def get_model():
    """Lazy-load the Keras model once on first prediction call."""
    global _model, _load_error
    if _load_error is not None:
        raise RuntimeError(_load_error)
    if _model is None:
        try:
            import tensorflow as tf

            model_path = _model_path()
            if not os.path.exists(model_path):
                raise FileNotFoundError(
                    f"sign_model.h5 not found at: {model_path}\n"
                    "Place the trained model file in models/ or set MODEL_PATH."
                )

            _model = tf.keras.models.load_model(model_path)
            print(f"Sign model loaded from {model_path}")
        except Exception as error:
            _load_error = str(error)
            raise RuntimeError(f"Could not load sign model: {error}") from error
    return _model


def warmup() -> tuple[bool, str | None]:
    """
    Eagerly load the model. Returns (ok, error_message).
    """
    global _load_error
    _load_error = None
    try:
        get_model()
        return True, None
    except Exception as e:
        return False, str(e)


def predict(landmarks: list) -> dict:
    """
    Run inference on 63 hand landmark floats.

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
