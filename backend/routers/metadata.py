"""Metadata endpoints — TMDB proxy + home-screen aggregation."""
import asyncio

from fastapi import APIRouter, HTTPException, Query

import tmdb

router = APIRouter(prefix="/api/metadata", tags=["metadata"])


@router.get("/search")
async def search(query: str = Query(..., min_length=1), type: str = "all"):
    return {"query": query, "type": type, "results": await tmdb.search(query, type)}


@router.get("/tmdb/{media_type}/{tmdb_id}")
async def get_metadata(media_type: str, tmdb_id: int):
    if media_type not in ("movie", "tv"):
        raise HTTPException(400, "media_type must be 'movie' or 'tv'")
    data = await tmdb.details(media_type, tmdb_id)
    if not data:
        raise HTTPException(404, "Not found")
    return data


@router.get("/{media_type}/{tmdb_id}/seasons")
async def get_seasons(media_type: str, tmdb_id: int):
    if media_type != "tv":
        raise HTTPException(400, "Seasons are only available for series")
    return await tmdb.seasons(tmdb_id)


@router.get("/home")
async def home():
    """Everything the home screen needs in one call."""
    (
        trending_movies, trending_tv, popular_tv, popular_movies, il_series, genre_rows
    ) = await asyncio.gather(
        tmdb.trending("movie"),
        tmdb.trending("tv"),
        tmdb.popular("tv"),
        tmdb.popular("movie"),
        tmdb.israeli_series(),
        tmdb.home_genre_rows(),
    )

    hero_pool = [
        c for c in trending_movies + trending_tv
        if c.get("backdrop_path") or c.get("backdrop_url")
    ]

    rows = [
        {"key": "recommended_series", "title": "סדרות מומלצות", "items": popular_tv},
        {"key": "recommended_movies", "title": "סרטים מומלצים", "items": popular_movies},
        {"key": "israeli_series", "title": "סדרות ישראליות", "items": il_series},
    ]
    for gr in genre_rows:
        rows.append({"key": f"genre_{gr['title']}", "title": gr["title"], "items": gr["items"]})

    return {"hero": hero_pool[:6], "rows": rows}
