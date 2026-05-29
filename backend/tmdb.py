"""TMDB client — all requests use Hebrew (he-IL) and cache to SQLite (24h TTL).

The public functions return normalised dicts the frontend consumes directly.
When no TMDB key is configured the client returns empty/placeholder data so
the app still renders.
"""
import logging
from typing import Optional

import httpx

import demo_data
from config import settings
from database import cache_get, cache_set

log = logging.getLogger("mytv.tmdb")


def _demo() -> bool:
    """True when no TMDB key is configured — serve demo content instead."""
    return not settings.tmdb_api_key

# Genre rows the home screen asks for -> TMDB genre ids
GENRE_IDS = {
    "אקשן": {"movie": 28, "tv": 10759},
    "קומדיה": {"movie": 35, "tv": 35},
    "דרמה": {"movie": 18, "tv": 18},
    "אימה": {"movie": 27, "tv": 9648},
    "אנימה": {"movie": 16, "tv": 16},
    "דוקומנטרי": {"movie": 99, "tv": 99},
}


def img(path: Optional[str], size: str = "w500") -> Optional[str]:
    if not path:
        return None
    return f"{settings.tmdb_image_base}/{size}{path}"


async def _get(path: str, params: Optional[dict] = None, cache: bool = True) -> dict:
    if not settings.tmdb_api_key:
        log.warning("TMDB_API_KEY missing — returning empty payload for %s", path)
        return {}

    params = dict(params or {})
    params.setdefault("language", settings.tmdb_language)
    cache_key = f"tmdb:{path}:{sorted(params.items())}"

    if cache:
        cached = await cache_get(cache_key)
        if cached is not None:
            return cached

    headers = {"Accept": "application/json"}
    # Support both v3 api_key and v4 bearer tokens.
    if settings.tmdb_api_key.startswith("ey") and "." in settings.tmdb_api_key:
        headers["Authorization"] = f"Bearer {settings.tmdb_api_key}"
    else:
        params["api_key"] = settings.tmdb_api_key

    url = f"{settings.tmdb_base_url}{path}"
    try:
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.get(url, params=params, headers=headers)
            resp.raise_for_status()
            data = resp.json()
    except httpx.HTTPError as e:
        log.error("TMDB request failed (%s): %s", path, e)
        return {}

    if cache:
        await cache_set(cache_key, data)
    return data


# ---------------------------- normalisation -------------------------------

def _year(date: Optional[str]) -> str:
    return (date or "")[:4]


def normalise_card(raw: dict, media_type: Optional[str] = None) -> dict:
    mt = media_type or raw.get("media_type") or ("tv" if raw.get("name") else "movie")
    title = raw.get("title") or raw.get("name") or raw.get("original_title") or ""
    date = raw.get("release_date") or raw.get("first_air_date")
    return {
        "tmdb_id": raw.get("id"),
        "media_type": mt,
        "title": title,
        "overview": raw.get("overview") or "",
        "poster_path": raw.get("poster_path"),
        "backdrop_path": raw.get("backdrop_path"),
        "poster_url": img(raw.get("poster_path"), "w500"),
        "backdrop_url": img(raw.get("backdrop_path"), "w1280"),
        "rating": round(raw.get("vote_average") or 0, 1),
        "year": _year(date),
    }


# ------------------------------- public API -------------------------------

async def search(query: str, media_type: str = "all") -> list[dict]:
    if _demo():
        return demo_data.search(query, media_type)
    if media_type == "movie":
        data = await _get("/search/movie", {"query": query}, cache=False)
        results = data.get("results", [])
        return [normalise_card(r, "movie") for r in results]
    if media_type in ("tv", "series"):
        data = await _get("/search/tv", {"query": query}, cache=False)
        results = data.get("results", [])
        return [normalise_card(r, "tv") for r in results]

    data = await _get("/search/multi", {"query": query}, cache=False)
    out = []
    for r in data.get("results", []):
        if r.get("media_type") in ("movie", "tv"):
            out.append(normalise_card(r))
    return out


async def details(media_type: str, tmdb_id: int) -> dict:
    if _demo():
        return demo_data.detail(media_type, tmdb_id)
    append = "credits,similar,videos,images"
    data = await _get(f"/{media_type}/{tmdb_id}", {"append_to_response": append})
    if not data:
        return {}

    card = normalise_card(data, media_type)
    credits = data.get("credits", {})
    cast = [
        {
            "name": c.get("name"),
            "character": c.get("character"),
            "profile_url": img(c.get("profile_path"), "w185"),
        }
        for c in credits.get("cast", [])[:15]
    ]
    crew = credits.get("crew", [])
    director = next((c["name"] for c in crew if c.get("job") == "Director"), None)

    similar = [normalise_card(r, media_type) for r in data.get("similar", {}).get("results", [])]

    detail = {
        **card,
        "genres": [g["name"] for g in data.get("genres", [])],
        "cast": cast,
        "director": director,
        "similar": similar,
        "status": data.get("status"),
    }

    if media_type == "movie":
        detail["runtime"] = data.get("runtime")
    else:  # tv
        detail["number_of_seasons"] = data.get("number_of_seasons")
        detail["number_of_episodes"] = data.get("number_of_episodes")
        detail["seasons"] = [
            {
                "season_number": s.get("season_number"),
                "name": s.get("name"),
                "episode_count": s.get("episode_count"),
                "poster_url": img(s.get("poster_path"), "w342"),
            }
            for s in data.get("seasons", [])
            if s.get("season_number", 0) >= 1
        ]
    return detail


async def seasons(tmdb_id: int) -> dict:
    """Full season + episode listing for a series."""
    if _demo():
        return demo_data.seasons(tmdb_id)
    show = await _get(f"/tv/{tmdb_id}")
    if not show:
        return {"tmdb_id": tmdb_id, "seasons": []}
    out_seasons = []
    for s in show.get("seasons", []):
        sn = s.get("season_number", 0)
        if sn < 1:
            continue
        season_data = await _get(f"/tv/{tmdb_id}/season/{sn}")
        episodes = [
            {
                "episode_number": e.get("episode_number"),
                "name": e.get("name"),
                "overview": e.get("overview") or "",
                "still_url": img(e.get("still_path"), "w300"),
                "air_date": e.get("air_date"),
                "runtime": e.get("runtime"),
                "rating": round(e.get("vote_average") or 0, 1),
            }
            for e in season_data.get("episodes", [])
        ]
        out_seasons.append({
            "season_number": sn,
            "name": s.get("name"),
            "episodes": episodes,
        })
    return {"tmdb_id": tmdb_id, "title": show.get("name"), "seasons": out_seasons}


async def _list(path: str, media_type: str, params: Optional[dict] = None) -> list[dict]:
    data = await _get(path, params)
    return [normalise_card(r, media_type) for r in data.get("results", [])]


async def trending(media_type: str) -> list[dict]:
    if _demo():
        return demo_data.cards(media_type, 10)
    return await _list(f"/trending/{media_type}/week", media_type)


async def popular(media_type: str) -> list[dict]:
    if _demo():
        return demo_data.cards(media_type, 10, offset=2)
    return await _list(f"/{media_type}/popular", media_type)


async def by_genre(media_type: str, genre_id: int) -> list[dict]:
    if _demo():
        return demo_data.cards(media_type, 10, offset=genre_id % 5)
    return await _list(
        f"/discover/{media_type}",
        media_type,
        {"with_genres": genre_id, "sort_by": "popularity.desc"},
    )


async def israeli_series() -> list[dict]:
    """Series originally produced in Israel / in Hebrew."""
    if _demo():
        return demo_data.cards("tv", 10, offset=1)
    return await _list(
        "/discover/tv",
        "tv",
        {"with_origin_country": "IL", "sort_by": "popularity.desc"},
    )


async def home_genre_rows() -> list[dict]:
    rows = []
    for name, ids in GENRE_IDS.items():
        items = await by_genre("movie", ids["movie"])
        rows.append({"title": name, "items": items})
    return rows
