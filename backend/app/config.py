"""Runtime configuration read from environment variables (with .env support)."""
import os
from pathlib import Path

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{BASE_DIR / 'zoom.db'}")
# Hosted Postgres providers hand out "postgres://" URLs; SQLAlchemy needs the driver name.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = "postgresql+psycopg://" + DATABASE_URL[len("postgres://"):]
elif DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = "postgresql+psycopg://" + DATABASE_URL[len("postgresql://"):]
FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000").rstrip("/")

# Comma-separated list of extra origins allowed by CORS (e.g. a custom domain).
CORS_ORIGINS = [FRONTEND_URL] + [
    origin.strip().rstrip("/")
    for origin in os.getenv("CORS_ORIGINS", "").split(",")
    if origin.strip()
]
# Optional regex for dynamic origins, e.g. Vercel previews: https://my-app-.*\.vercel\.app
CORS_ORIGIN_REGEX = os.getenv("CORS_ORIGIN_REGEX") or None

# How long a login stays valid.
SESSION_TTL_DAYS = int(os.getenv("SESSION_TTL_DAYS", "30"))

# Seconds an empty live meeting is kept open before being auto-ended,
# so a page refresh doesn't end the meeting.
EMPTY_MEETING_GRACE_SECONDS = int(os.getenv("EMPTY_MEETING_GRACE_SECONDS", "60"))
