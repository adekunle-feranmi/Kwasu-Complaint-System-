"""
Abuse detection: profanity wordlist + regex pattern matching.

Runs BEFORE ML classification. If a complaint is flagged, it goes to the
flagged queue and is NOT published or classified until an admin reviews it.

Returns (is_abusive: bool, reason: str|None) where reason names the
matched word or pattern (used for the abuse_flags.flag_reason column).
"""

import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
WORDLIST_PATH = os.path.join(HERE, "..", "..", "data", "profanity_list.txt")

# Regex patterns for abusive *phrases* (not single words).
# Defined per the brief's example (incompetent\s+lecturer) plus common
# abusive structures. Extend as needed.
ABUSIVE_PATTERNS = [
    r"incompetent\s+\w+",
    r"useless\s+(lecturer|staff|admin|management|school)",
    r"(stupid|dumb|foolish)\s+\w+",
    r"\bgo\s+to\s+hell\b",
    r"\bshut\s+up\b",
    r"\bwhat\s+(a\s+)?nonsense\b",
]


def _load_wordlist(path=WORDLIST_PATH):
    words = set()
    try:
        with open(path, "r", encoding="utf-8", errors="ignore") as f:
            for line in f:
                line = line.strip().lower()
                if line and not line.startswith("#"):
                    words.add(line)
    except FileNotFoundError:
        pass
    return words


_WORDS = _load_wordlist()
_COMPILED = [re.compile(p, re.IGNORECASE) for p in ABUSIVE_PATTERNS]


def detect_abuse(text: str):
    """Return (is_abusive, reason)."""
    if not text:
        return False, None

    lowered = text.lower()

    # 1) regex phrase patterns
    for pat in _COMPILED:
        m = pat.search(lowered)
        if m:
            return True, f"matched abusive pattern: '{m.group(0).strip()}'"

    # 2) wordlist (whole-word match)
    tokens = re.findall(r"[a-zA-Z']+", lowered)
    for tok in tokens:
        if tok in _WORDS:
            return True, f"matched profanity word: '{tok}'"

    return False, None


def reload_wordlist():
    """Re-read the wordlist file (e.g. after updating it)."""
    global _WORDS
    _WORDS = _load_wordlist()
    return len(_WORDS)
