"""
Abuse detection: profanity wordlist + regex pattern matching,
now with evasion-resistant normalisation.

Runs BEFORE ML classification. If a complaint is flagged, it goes to the
flagged queue and is NOT published or classified until an admin reviews it.

Two improvements over the original version:
  1. Loads a larger wordlist (e.g. the LDNOOBW open-source list) if present.
  2. Normalises the text before checking, to catch common evasion tricks:
       - character substitution (l3cturer -> lecturer, stup1d -> stupid)
       - spacing tricks (i d i o t -> idiot)
     Both the original and the normalised text are checked, so legitimate
     matches still work and disguised ones are also caught.

Returns (is_abusive: bool, reason: str|None).
"""

import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(HERE, "..", "..", "data")
# Primary list (large, e.g. LDNOOBW en.txt) with fallback to the starter list.
WORDLIST_CANDIDATES = [
    os.path.join(DATA_DIR, "profanity_list_full.txt"),   # LDNOOBW or similar
    os.path.join(DATA_DIR, "profanity_list.txt"),        # starter fallback
]

# Regex patterns for abusive *phrases* (matched on normalised text).
ABUSIVE_PATTERNS = [
    r"incompetent\s+\w+",
    r"useless\s+(lecturer|staff|admin|management|school|people)",
    r"(stupid|dumb|foolish|idiotic|moronic)\s+\w+",
    r"\bgo\s+to\s+hell\b",
    r"\bshut\s+up\b",
    r"\bwhat\s+(a\s+)?nonsense\b",
]

# Map common look-alike substitutions to letters (leetspeak).
_SUBS = str.maketrans({
    "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s",
})


def _load_wordlist():
    words = set()
    for path in WORDLIST_CANDIDATES:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8", errors="ignore") as f:
                    for line in f:
                        w = line.strip().lower()
                        if w and not w.startswith("#"):
                            words.add(w)
                # Use the first list that exists (full preferred over starter).
                if words:
                    break
            except OSError:
                continue
    return words


_WORDS = _load_wordlist()
_COMPILED = [re.compile(p, re.IGNORECASE) for p in ABUSIVE_PATTERNS]


def _normalise(text: str) -> str:
    """Lowercase, map leetspeak substitutions, and collapse single-letter
    spacing (i d i o t s -> idiots) so evasion attempts still match."""
    t = text.lower().translate(_SUBS)
    # Collapse runs of single letters separated by spaces (3+ letters),
    # allowing a final multi-letter chunk to attach (…o t s -> ots).
    t = re.sub(r"\b(?:[a-z]\s){2,}[a-z]+\b",
               lambda m: m.group(0).replace(" ", ""), t)
    return t


def _scan(text: str):
    """Check one form of the text. Returns (matched, reason) or (False, None)."""
    # phrase patterns
    for pat in _COMPILED:
        m = pat.search(text)
        if m:
            return True, f"matched abusive pattern: '{m.group(0).strip()}'"
    # wordlist (whole-word match)
    for tok in re.findall(r"[a-zA-Z']+", text):
        if tok in _WORDS:
            return True, f"matched profanity word: '{tok}'"
    return False, None


def detect_abuse(text: str):
    """Return (is_abusive, reason). Checks both the raw and normalised text."""
    if not text:
        return False, None

    # 1) check the original lowercased text
    matched, reason = _scan(text.lower())
    if matched:
        return True, reason

    # 2) check the normalised text (catches leetspeak / spacing evasion)
    normalised = _normalise(text)
    if normalised != text.lower():
        matched, reason = _scan(normalised)
        if matched:
            return True, (reason + " (after normalising disguised text)")

    return False, None


def reload_wordlist():
    """Re-read the wordlist file (e.g. after updating it)."""
    global _WORDS
    _WORDS = _load_wordlist()
    return len(_WORDS)


def wordlist_size():
    return len(_WORDS)
