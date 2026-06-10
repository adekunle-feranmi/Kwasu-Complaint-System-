"""
ID-card OCR helper.

Reads text from an uploaded ID image and checks whether the student's typed
matric number appears on the card. Designed to DEGRADE GRACEFULLY: if the OCR
engine (Tesseract) or Pillow is not installed on the host (e.g. Render free
tier), it returns 'unavailable' instead of crashing, and the admin still
reviews the image manually.

Returns one of: 'match', 'mismatch', 'unreadable', 'unavailable'
plus the raw text read from the card (or None).
"""
import re
import io


def _normalize(s: str) -> str:
    """Keep only alphanumerics, uppercase — so 23/02/0106 == 23020106 style
    comparisons are forgiving of slashes, spaces and case."""
    return re.sub(r"[^A-Za-z0-9]", "", s or "").upper()


def check_id_matric(image_bytes: bytes, typed_matric: str):
    """Compare typed matric number against text read from the ID image."""
    typed_norm = _normalize(typed_matric)

    # Try to import the OCR stack; if missing, signal 'unavailable'.
    try:
        from PIL import Image
        import pytesseract
    except Exception:
        return "unavailable", None

    try:
        img = Image.open(io.BytesIO(image_bytes))
        raw_text = pytesseract.image_to_string(img)
    except pytesseract.TesseractNotFoundError:
        return "unavailable", None
    except Exception:
        return "unreadable", None

    if not raw_text or not raw_text.strip():
        return "unreadable", None

    ocr_norm = _normalize(raw_text)

    if not typed_norm:
        # No typed matric to compare against; just return what we read.
        return "unreadable", raw_text.strip()[:255]

    # Match if the typed matric appears anywhere in the OCR'd text.
    if typed_norm in ocr_norm:
        return "match", raw_text.strip()[:255]
    return "mismatch", raw_text.strip()[:255]
