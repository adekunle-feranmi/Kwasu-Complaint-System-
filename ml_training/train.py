"""
KWASU Complaint Classifier — Training Pipeline
==============================================
Trains and compares Naive Bayes and SVM on the labeled complaint dataset,
then hard-codes (exports) the better-performing model for the prediction
pipeline.

Categories: Academic, Administrative  (2 classes)

Pipeline (per project brief):
  - clean + deduplicate
  - 85/15 train/test split (stratified)
  - 5-fold cross-validation on the training set
  - TF-IDF vectorisation
  - chi-square feature selection (top-K informative words)
  - SVM C sweep: 0.1, 1, 10, 100 ; NB alpha sweep
  - class_weight='balanced' for SVM to handle imbalance
  - compare on accuracy / precision / recall / F1
  - export vectorizer.pkl, selector.pkl, classifier.pkl

Run:  python train.py
Outputs: ../backend/models/{vectorizer,selector,classifier}.pkl
         training_results.txt
"""

import os
import re
import pickle
import warnings
import numpy as np
import pandas as pd

from sklearn.model_selection import train_test_split, GridSearchCV, StratifiedKFold
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.feature_selection import SelectKBest, chi2
from sklearn.naive_bayes import MultinomialNB
from sklearn.svm import LinearSVC
from sklearn.metrics import (accuracy_score, precision_score, recall_score,
                             f1_score, classification_report, confusion_matrix)

warnings.filterwarnings("ignore")

HERE = os.path.dirname(os.path.abspath(__file__))
DATASET = os.path.join(HERE, "dataset.csv")
MODELS_DIR = os.path.join(HERE, "..", "backend", "models")
RESULTS = os.path.join(HERE, "training_results.txt")
RANDOM_STATE = 42

# ----------------------------------------------------------------------
# Simple, dependency-free preprocessing (mirrors abuse_detector/predictor)
# ----------------------------------------------------------------------
STOPWORDS = {
    "the","a","an","and","or","but","is","are","was","were","be","been","being",
    "to","of","in","on","at","for","with","by","from","as","that","this","these",
    "those","it","its","i","we","you","they","he","she","my","our","your","their",
    "have","has","had","do","does","did","not","no","so","very","too","can","will",
    "would","should","could","me","us","them","am","about","into","than","then"
}

def preprocess(text: str) -> str:
    text = str(text).lower()
    text = re.sub(r"[^a-z\s]", " ", text)          # strip non-letters
    tokens = [t for t in text.split() if t not in STOPWORDS and len(t) > 1]
    return " ".join(tokens)


def load_and_clean():
    df = pd.read_csv(DATASET)
    df.columns = [c.strip() for c in df.columns]
    df = df.rename(columns={"Complaint": "text", "Category": "label"})
    df["label"] = df["label"].astype(str).str.strip()
    df["text"] = df["text"].astype(str).str.strip()

    before = len(df)
    df = df[df["text"].str.len() > 0]
    # deduplicate BEFORE split to avoid train/test leakage
    df = df.drop_duplicates(subset=["text"]).reset_index(drop=True)
    after = len(df)

    df["clean"] = df["text"].apply(preprocess)
    df = df[df["clean"].str.len() > 0].reset_index(drop=True)

    return df, before, after


def main():
    os.makedirs(MODELS_DIR, exist_ok=True)
    lines = []
    def log(s=""):
        print(s)
        lines.append(s)

    df, before, after = load_and_clean()

    log("=" * 64)
    log("KWASU Complaint Classifier — Training Results")
    log("=" * 64)
    log(f"Raw rows in dataset.csv          : {before}")
    log(f"Rows after dedup + empty removal : {after}")
    log(f"Usable rows after preprocessing  : {len(df)}")
    log("")
    log("Class distribution (after cleaning):")
    for label, n in df["label"].value_counts().items():
        log(f"   {label:<16} {n}")
    log("")

    classes = sorted(df["label"].unique())
    if len(classes) < 2:
        log("ERROR: need at least 2 classes to train. Aborting.")
        _write(lines)
        return

    X = df["clean"].values
    y = df["label"].values

    # 85/15 stratified split
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.15, random_state=RANDOM_STATE, stratify=y)
    log(f"Train/test split: {len(X_train)} train / {len(X_test)} test (85/15, stratified)")
    log("")

    # TF-IDF on training data
    vectorizer = TfidfVectorizer(ngram_range=(1, 2), min_df=1, sublinear_tf=True)
    Xtr_vec = vectorizer.fit_transform(X_train)
    Xte_vec = vectorizer.transform(X_test)
    vocab_size = len(vectorizer.vocabulary_)

    # chi-square feature selection.
    # Brief asks top 500-1000; this small corpus has fewer features,
    # so we cap K at the available vocabulary and report the real number.
    k = min(800, vocab_size)
    selector = SelectKBest(chi2, k=k)
    Xtr_sel = selector.fit_transform(Xtr_vec, y_train)
    Xte_sel = selector.transform(Xte_vec)
    log(f"TF-IDF vocabulary size           : {vocab_size}")
    log(f"chi-square features retained (k) : {k}")
    log("(Brief specifies 500-1000; corpus vocabulary is smaller, so k is "
        "capped to the available features.)")
    log("")

    cv = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)

    results = {}

    # ---------------- Naive Bayes ----------------
    nb_grid = GridSearchCV(
        MultinomialNB(),
        {"alpha": [0.01, 0.1, 0.5, 1.0]},
        cv=cv, scoring="accuracy")
    nb_grid.fit(Xtr_sel, y_train)
    nb = nb_grid.best_estimator_
    nb_pred = nb.predict(Xte_sel)
    results["Naive Bayes"] = _metrics(y_test, nb_pred, classes)
    log("Naive Bayes")
    log(f"   best alpha            : {nb_grid.best_params_['alpha']}")
    log(f"   CV accuracy (train)   : {nb_grid.best_score_:.4f}")
    _log_metrics(log, results["Naive Bayes"])
    log("")

    # ---------------- SVM ----------------
    svm_grid = GridSearchCV(
        LinearSVC(class_weight="balanced", random_state=RANDOM_STATE, max_iter=5000),
        {"C": [0.1, 1, 10, 100]},
        cv=cv, scoring="accuracy")
    svm_grid.fit(Xtr_sel, y_train)
    svm = svm_grid.best_estimator_
    svm_pred = svm.predict(Xte_sel)
    results["SVM"] = _metrics(y_test, svm_pred, classes)
    log("SVM (LinearSVC, class_weight=balanced)")
    log(f"   best C                : {svm_grid.best_params_['C']}")
    log(f"   CV accuracy (train)   : {svm_grid.best_score_:.4f}")
    _log_metrics(log, results["SVM"])
    log("")

    # ---------------- pick winner (by F1) ----------------
    winner_name = max(results, key=lambda m: results[m]["f1"])
    winner_model = nb if winner_name == "Naive Bayes" else svm

    log("=" * 64)
    log(f"WINNER (highest weighted F1): {winner_name}")
    log("=" * 64)
    log("")
    log("Confusion matrix (winner, on test set):")
    cm = confusion_matrix(y_test, winner_model.predict(Xte_sel), labels=classes)
    log("   labels: " + ", ".join(classes))
    for row_label, row in zip(classes, cm):
        log(f"   {row_label:<16} {row.tolist()}")
    log("")

    # ---------------- honesty note ----------------
    majority = df["label"].value_counts(normalize=True).max()
    log("NOTE ON INTERPRETATION:")
    log(f"  The majority class accounts for {majority*100:.1f}% of the data, so a")
    log("  trivial classifier that always predicts the majority class would score")
    log(f"  ~{majority*100:.1f}% accuracy. Read precision/recall/F1 per class, not")
    log("  headline accuracy. The dataset contains only 2 categories (Academic,")
    log("  Administrative); Facility and Finance from the original brief are not")
    log("  present and cannot be predicted.")
    log("")

    # ---------------- export ----------------
    with open(os.path.join(MODELS_DIR, "vectorizer.pkl"), "wb") as f:
        pickle.dump(vectorizer, f)
    with open(os.path.join(MODELS_DIR, "selector.pkl"), "wb") as f:
        pickle.dump(selector, f)
    with open(os.path.join(MODELS_DIR, "classifier.pkl"), "wb") as f:
        pickle.dump({"model": winner_model, "name": winner_name,
                     "classes": list(classes)}, f)
    log(f"Saved: vectorizer.pkl, selector.pkl, classifier.pkl -> {os.path.relpath(MODELS_DIR, HERE)}")

    _write(lines)


def _metrics(y_true, y_pred, classes):
    return {
        "accuracy":  accuracy_score(y_true, y_pred),
        "precision": precision_score(y_true, y_pred, average="weighted", zero_division=0),
        "recall":    recall_score(y_true, y_pred, average="weighted", zero_division=0),
        "f1":        f1_score(y_true, y_pred, average="weighted", zero_division=0),
        "report":    classification_report(y_true, y_pred, zero_division=0),
    }


def _log_metrics(log, m):
    log(f"   test accuracy         : {m['accuracy']:.4f}")
    log(f"   test precision (wtd)  : {m['precision']:.4f}")
    log(f"   test recall (wtd)     : {m['recall']:.4f}")
    log(f"   test F1 (wtd)         : {m['f1']:.4f}")


def _write(lines):
    with open(RESULTS, "w") as f:
        f.write("\n".join(lines) + "\n")


if __name__ == "__main__":
    main()
