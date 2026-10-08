"""Runtime configuration read from environment variables (with .env support)."""
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'zoom.db'}")
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")

# Comma-separated list of extra origins allowed by CORS (e.g. a custom domain).
CORS_ORIGINS = [FRONTEND_URL] + [
    origin.strip().rstrip("/")
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
]
# Optional regex for dynamic origins, e.g. Vercel previews: https://my-app-.*\.vercel\.app
CORS_ORIGIN_REGEX = os.getenv("CORS_ORIGIN_REGEX") or None

# The app has no auth: every request acts as this seeded user.
DEFAULT_USER_ID = 1

# Seconds an empty live meeting is kept open before being auto-ended,
# so a page refresh doesn't end the meeting.
EMPTY_MEETING_GRACE_SECONDS = int(os.getenv("EMPTY_MEETING_GRACE_SECONDS", "60"))
