"""Watch-history / continue-watching endpoints."""
from fastapi import APIRouter
from pydantic import BaseModel

import database as db

router = APIRouter(prefix="/api/watch-history", tags=["watch-history"])


class WatchBody(BaseModel):
    media_type: str
    tmdb_id: int
    season: int | None = None
    episode: int | None = None
    title: str | None = None
    poster_path: str | None = None
    backdrop_path: str | None = None
    position: float = 0      # seconds
    duration: float = 0      # seconds
    progress: float | None = None  # optional 0..1 fallback


@router.post("")
async def update(body: WatchBody):
    await db.upsert_watch(body.model_dump())
    return {"ok": True}


@router.get("")
async def history():
    return {"history": await db.list_watch_history()}


@router.get("/continue")
async def continue_watching():
    return {"continue": await db.continue_watching()}


@router.get("/episodes/{tmdb_id}")
async def episode_progress(tmdb_id: int):
    """Per-episode progress for a series, keyed 'season-episode'."""
    data = await db.get_episode_progress(tmdb_id)
    return {str(f"{s}-{e}"): v for (s, e), v in data.items()}
