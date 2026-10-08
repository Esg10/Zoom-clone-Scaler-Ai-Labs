"""FastAPI application entry point."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import CORS_ORIGIN_REGEX, CORS_ORIGINS
from app.database import Base, engine
from app.errors import register_error_handlers
from app.routers import auth, meetings, participants, users, ws
from app.seed import seed_if_empty

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Free hosts often have ephemeral disks, so create + seed on every boot if empty.
    Base.metadata.create_all(engine)
    if seed_if_empty():
        logging.getLogger(__name__).info("Seeded demo data")
    yield


app = FastAPI(title="Zoom Clone API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_methods=["*"],
    allow_headers=["*"],
)
register_error_handlers(app)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(meetings.router)
app.include_router(participants.router)
app.include_router(ws.router)


@app.get("/api/health", tags=["health"])
def health():
    return {"status": "ok"}
