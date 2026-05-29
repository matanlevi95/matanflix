"""SQLite persistence layer using aiosqlite.

Tables:
  - favorites:       user watchlist (movies + series)
  - watch_history:   per-item / per-episode progress
  - metadata_cache:  raw TMDB JSON with a TTL
"""
import json
import time
from typing import Any, Optional

import aiosqlite

from config import settings

_db: Optional[aiosqlite.Connection] = None


SCHEMA = """
CREATE TABLE IF NOT EXISTS favorites (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    media_type  TEXT NOT NULL,           -- 'movie' | 'tv'
    tmdb_id     INTEGER NOT NULL,
    title       TEXT,
    poster_path TEXT,
    backdrop_path TEXT,
    year        TEXT,
    rating      REAL,
    added_at    INTEGER NOT NULL,
    UNIQUE(media_type, tmdb_id)
);

CREATE TABLE IF NOT EXISTS watch_history (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    media_type    TEXT NOT NULL,          -- 'movie' | 'tv'
    tmdb_id       INTEGER NOT NULL,
    season        INTEGER,                -- NULL for movies
    episode       INTEGER,                -- NULL for movies
    title         TEXT,
    poster_path   TEXT,
    backdrop_path TEXT,
    position      REAL DEFAULT 0,         -- seconds watched
    duration      REAL DEFAULT 0,         -- total seconds
    progress      REAL DEFAULT 0,         -- 0..1
    watched       INTEGER DEFAULT 0,      -- bool: >=90% complete
    updated_at    INTEGER NOT NULL,
    UNIQUE(media_type, tmdb_id, season, episode)
);

CREATE TABLE IF NOT EXISTS metadata_cache (
    cache_key   TEXT PRIMARY KEY,
    payload     TEXT NOT NULL,
    created_at  INTEGER NOT NULL
);
"""


async def init_db() -> aiosqlite.Connection:
    global _db
    _db = await aiosqlite.connect(settings.database_path)
    _db.row_factory = aiosqlite.Row
    await _db.executescript(SCHEMA)
    await _db.commit()
    return _db


async def close_db() -> None:
    global _db
    if _db is not None:
        await _db.close()
        _db = None


def db() -> aiosqlite.Connection:
    if _db is None:
        raise RuntimeError("Database not initialised. Call init_db() first.")
    return _db


# ----------------------------- metadata cache -----------------------------

async def cache_get(key: str) -> Optional[dict]:
    cur = await db().execute(
        "SELECT payload, created_at FROM metadata_cache WHERE cache_key = ?", (key,)
    )
    row = await cur.fetchone()
    if row is None:
        return None
    if time.time() - row["created_at"] > settings.cache_ttl_seconds:
        await db().execute("DELETE FROM metadata_cache WHERE cache_key = ?", (key,))
        await db().commit()
        return None
    return json.loads(row["payload"])


async def cache_set(key: str, payload: dict) -> None:
    await db().execute(
        "INSERT OR REPLACE INTO metadata_cache (cache_key, payload, created_at) VALUES (?, ?, ?)",
        (key, json.dumps(payload, ensure_ascii=False), int(time.time())),
    )
    await db().commit()


async def cache_clear() -> int:
    cur = await db().execute("SELECT COUNT(*) AS n FROM metadata_cache")
    n = (await cur.fetchone())["n"]
    await db().execute("DELETE FROM metadata_cache")
    await db().commit()
    return n


# ------------------------------- favorites --------------------------------

async def add_favorite(item: dict) -> None:
    await db().execute(
        """INSERT OR REPLACE INTO favorites
           (media_type, tmdb_id, title, poster_path, backdrop_path, year, rating, added_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
            item["media_type"], item["tmdb_id"], item.get("title"),
            item.get("poster_path"), item.get("backdrop_path"),
            item.get("year"), item.get("rating"), int(time.time()),
        ),
    )
    await db().commit()


async def remove_favorite(media_type: str, tmdb_id: int) -> None:
    await db().execute(
        "DELETE FROM favorites WHERE media_type = ? AND tmdb_id = ?", (media_type, tmdb_id)
    )
    await db().commit()


async def list_favorites() -> list[dict]:
    cur = await db().execute("SELECT * FROM favorites ORDER BY added_at DESC")
    return [dict(r) for r in await cur.fetchall()]


async def is_favorite(media_type: str, tmdb_id: int) -> bool:
    cur = await db().execute(
        "SELECT 1 FROM favorites WHERE media_type = ? AND tmdb_id = ?", (media_type, tmdb_id)
    )
    return await cur.fetchone() is not None


# ----------------------------- watch history ------------------------------

async def upsert_watch(item: dict) -> None:
    duration = float(item.get("duration") or 0)
    position = float(item.get("position") or 0)
    progress = position / duration if duration > 0 else float(item.get("progress") or 0)
    progress = max(0.0, min(progress, 1.0))
    watched = 1 if progress >= 0.9 else 0
    await db().execute(
        """INSERT INTO watch_history
            (media_type, tmdb_id, season, episode, title, poster_path, backdrop_path,
             position, duration, progress, watched, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
           ON CONFLICT(media_type, tmdb_id, season, episode) DO UPDATE SET
            title=excluded.title, poster_path=excluded.poster_path,
            backdrop_path=excluded.backdrop_path, position=excluded.position,
            duration=excluded.duration, progress=excluded.progress,
            watched=excluded.watched, updated_at=excluded.updated_at""",
        (
            item["media_type"], item["tmdb_id"], item.get("season"), item.get("episode"),
            item.get("title"), item.get("poster_path"), item.get("backdrop_path"),
            position, duration, progress, watched, int(time.time()),
        ),
    )
    await db().commit()


async def list_watch_history() -> list[dict]:
    cur = await db().execute("SELECT * FROM watch_history ORDER BY updated_at DESC")
    return [dict(r) for r in await cur.fetchall()]


async def continue_watching() -> list[dict]:
    """Items that are started but not finished, most-recent first.

    For series we collapse to one entry per show (the most recently touched
    episode that is still in progress)."""
    cur = await db().execute(
        """SELECT * FROM watch_history
           WHERE watched = 0 AND progress > 0.01
           ORDER BY updated_at DESC"""
    )
    rows = [dict(r) for r in await cur.fetchall()]
    seen: set[tuple] = set()
    out: list[dict] = []
    for r in rows:
        key = (r["media_type"], r["tmdb_id"])
        if key in seen:
            continue
        seen.add(key)
        out.append(r)
    return out


async def get_episode_progress(tmdb_id: int) -> dict[tuple[int, int], dict]:
    cur = await db().execute(
        "SELECT * FROM watch_history WHERE media_type = 'tv' AND tmdb_id = ?", (tmdb_id,)
    )
    result: dict[tuple[int, int], dict] = {}
    for r in await cur.fetchall():
        result[(r["season"], r["episode"])] = dict(r)
    return result
