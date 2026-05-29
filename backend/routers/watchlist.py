"""Watchlist (favorites) endpoints."""
from fastapi import APIRouter
from pydantic import BaseModel

import database as db

router = APIRouter(prefix="/api/watchlist", tags=["watchlist"])


class FavoriteBody(BaseModel):
    media_type: str
    tmdb_id: int
    title: str | None = None
    poster_path: str | None = None
    backdrop_path: str | None = None
    year: str | None = None
    rating: float | None = None


@router.post("/add")
async def add(body: FavoriteBody):
    await db.add_favorite(body.model_dump())
    return {"ok": True}


@router.post("/remove")
async def remove(media_type: str, tmdb_id: int):
    await db.remove_favorite(media_type, tmdb_id)
    return {"ok": True}


@router.get("")
async def list_all():
    return {"favorites": await db.list_favorites()}


@router.get("/status")
async def status(media_type: str, tmdb_id: int):
    return {"is_favorite": await db.is_favorite(media_type, tmdb_id)}
