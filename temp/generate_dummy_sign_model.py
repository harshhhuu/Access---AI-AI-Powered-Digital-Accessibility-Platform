#!/usr/bin/env python3
"""One-off: write a minimal valid sign_model.h5 for local verification (not for production)."""
import os
import sys

import tensorflow as tf

ROOT = os.path.join(os.path.dirname(__file__), "..", "services", "sign-inference", "models", "sign_model.h5")
ROOT = os.path.abspath(ROOT)


def main() -> None:
    model = tf.keras.Sequential(
        [
            tf.keras.layers.Dense(10, activation="softmax", input_shape=(63,)),
        ]
    )
    model.compile(optimizer="adam", loss="categorical_crossentropy")
    model.save(ROOT)
    print(f"Wrote dummy model to {ROOT}")


if __name__ == "__main__":
    sys.exit(main() or 0)
