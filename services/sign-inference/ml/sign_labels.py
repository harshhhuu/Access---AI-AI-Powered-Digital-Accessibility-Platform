import json
import os

# Load from sign_labels.json (delivered by ML team)
_json_path = os.path.join(os.path.dirname(__file__), "..", "models", "sign_labels.json")

try:
    with open(_json_path, encoding="utf-8") as f:
        LABELS = json.load(f)
except FileNotFoundError:
    # Fallback — exact labels from your trained model (alphabetical order from sklearn LabelEncoder)
    LABELS = [
        "bad",
        "good",
        "hello",
        "help",
        "more",
        "no",
        "stop",
        "thanks",
        "water",
        "yes",
    ]

assert len(LABELS) == 10, f"Expected 10 labels, got {len(LABELS)}"
