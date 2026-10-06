from __future__ import annotations

import hashlib
import hmac

_SALT = 'a2ed3ece632b7d09450f7febb727253e4d1d8ad104dd0041'
_EXPECTED = '8a7dac58371095c648c57fab565391e53fcfa1290cc91450aadd524a44591f7e'
_ITERATIONS = 260000

_FAREWELL = {
    "title": 'برای شما که بخشی از خاطرات من شدید',
    "message": 'رفتن برای من آسون نیست؛ چون بخشی از بهترین خاطرات این مسیر، کنار شما ساخته شد.\nاینجا برای من فقط محل کار نبود؛ پر از خنده\u200cها، روزهای سخت، کمک\u200cکردن\u200cها، شوخی\u200cها و لحظه\u200cهایی بود که همیشه با من می\u200cمونن.\n\nاز اینکه دارم می\u200cرم ناراحتم، اما فکر می\u200cکنم آدم برای رشد و پیشرفت گاهی باید جرأت کنه یک مسیر تازه رو شروع کنه؛ حتی وقتی دل کندن سخت باشه.\n\nهرجا که باشم، به یادتونم و با محبت از این روزها یاد می\u200cکنم. دوستتون دارم و بابت تمام همراهی\u200cها، رفاقت\u200cها، صبوری\u200cها و خاطرات خوبی که با هم ساختیم واقعاً ازتون ممنونم.\n\nامیدوارم مسیر زندگی دوباره ما رو در بهترین شرایط کنار هم قرار بده و باز هم با هم بخندیم.\nمراقب خودتون باشید و همیشه رو به جلو برید.',
    "signature": 'با مهر و کلی خاطره خوب 🤍',
    "date": '',
}

def verify_farewell_code(code: str) -> bool:
    candidate = hashlib.pbkdf2_hmac(
        "sha256",
        (code or "").encode("utf-8"),
        bytes.fromhex(_SALT),
        _ITERATIONS,
    )
    return hmac.compare_digest(candidate, bytes.fromhex(_EXPECTED))

def get_farewell_payload() -> dict:
    return dict(_FAREWELL)
