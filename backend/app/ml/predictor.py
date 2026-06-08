"""
Real-time complaint classifier.

Loads the trained artifacts (vectorizer, selector, classifier) once at
import and exposes classify(text) -> category string.

Preprocessing here MUST match ml_training/train.py.
"""

import os
import re
import pickle

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.path.join(HERE, "..", "..", "models")

STOPWORDS = {
    "the","a","an","and","or","but","is","are","was","were","be","been","being",
    "to","of","in","on","at","for","with","by","from","as","that","this","these",
    "those","it","its","i","we","you","they","he","she","my","our","your","their",
    "have","has","had","do","does","did","not","no","so","very","too","can","will",
    "would","should","could","me","us","them","am","about","into","than","then"
}


def preprocess(text: str) -> str:
    text = str(text).lower()
    text = re.sub(r"[^a-z\s]", " ", text)
    tokens = [t for t in text.split() if t not in STOPWORDS and len(t) > 1]
    return " ".join(tokens)


class _Predictor:
    def __init__(self):
        self.vectorizer = None
        self.selector = None
        self.model = None
        self.classes = None
        self.name = None
        self._load()

    def _load(self):
        try:
            with open(os.path.join(MODELS_DIR, "vectorizer.pkl"), "rb") as f:
                self.vectorizer = pickle.load(f)
            with open(os.path.join(MODELS_DIR, "selector.pkl"), "rb") as f:
                self.selector = pickle.load(f)
            with open(os.path.join(MODELS_DIR, "classifier.pkl"), "rb") as f:
                bundle = pickle.load(f)
                self.model = bundle["model"]
                self.name = bundle.get("name", "model")
                self.classes = bundle.get("classes")
        except FileNotFoundError:
            # Models not trained yet — classify() will fall back.
            pass

    @property
    def ready(self):
        return all([self.vectorizer, self.selector, self.model])

    def classify(self, text: str) -> str:
        if not self.ready:
            # Safe fallback so the app still works before training.
            return "Administrative"
        cleaned = preprocess(text)
        if not cleaned:
            return "Administrative"
        vec = self.vectorizer.transform([cleaned])
        sel = self.selector.transform(vec)
        return str(self.model.predict(sel)[0])


_predictor = _Predictor()


def classify(text: str) -> str:
    return _predictor.classify(text)


def model_info():
    return {"name": _predictor.name, "classes": _predictor.classes,
            "ready": _predictor.ready}
