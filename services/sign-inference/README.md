# Sign inference service (Phase 1)

Internal **Python** microservice: loads the Keras `sign_model.h5` and exposes `POST /predict`. No database, JWT, or Hugging Face — only TensorFlow inference.

## Setup

```bash
cd services/sign-inference
python3 -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

Place `sign_model.h5` in `models/` (see `models/README.txt`), or set `MODEL_PATH` to an absolute path.

## Run (default port 9001)

```bash
cd services/sign-inference
source .venv/bin/activate
PYTHONPATH=. uvicorn app.main:app --host 127.0.0.1 --port 9001
```

## API

| Method | Path | Description |
| --- | --- | --- |
| GET | `/health` | `model_loaded`, `status` (`ok` or `degraded`) |
| POST | `/predict` | Body: `{"landmarks": [63 floats]}` → `{"sign", "confidence"}` |

Errors: **400** if landmark count ≠ 63; **503** if the model is missing or inference fails.

## Environment

| Variable | Description |
| --- | --- |
| `MODEL_PATH` | Optional absolute path to `sign_model.h5` |

## Docker

```bash
docker build -t accessai-sign-inference services/sign-inference
docker run --rm -p 9001:9001 -v /path/to/sign_model.h5:/app/models/sign_model.h5:ro accessai-sign-inference
```
