"""Internet Archive source — searches public-domain / freely licensed video.

Legal: archive.org hosts public-domain and CC content. No API key required.
"""
import logging
from typing import Optional

import httpx

from .base import BaseSource, VideoResult

log = logging.getLogger("mytv.source.archive")

SEARCH = "https://archive.org/advancedsearch.php"
META = "https://archive.org/metadata"
DOWNLOAD = "https://archive.org/download"


class ArchiveSource(BaseSource):
    name = "archive"

    async def search(self, query, type="all", season=None, episode=None, imdb_id=None) -> list[VideoResult]:
        q = f'({query}) AND mediatype:(movies)'
        params = {
            "q": q,
            "fl[]": ["identifier", "title", "description", "year"],
            "rows": 15,
            "page": 1,
            "output": "json",
        }
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(SEARCH, params=params)
                resp.raise_for_status()
                data = resp.json()
        except httpx.HTTPError as e:
            log.error("Archive search failed: %s", e)
            return []

        results = []
        for doc in data.get("response", {}).get("docs", []):
            ident = doc.get("identifier")
            if not ident:
                continue
            title = doc.get("title")
            if isinstance(title, list):
                title = title[0] if title else ident
            results.append(
                VideoResult(
                    source=self.name,
                    video_id=ident,
                    title=title or ident,
                    thumbnail=f"https://archive.org/services/img/{ident}",
                    description=str(doc.get("description") or "")[:500],
                    quality="SD",
                )
            )
        return results

    async def get_stream_url(self, video_id: str) -> Optional[str]:
        """Resolve a playable file from the item's metadata (prefer mp4)."""
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(f"{META}/{video_id}")
                resp.raise_for_status()
                data = resp.json()
        except httpx.HTTPError as e:
            log.error("Archive metadata failed: %s", e)
            return None

        files = data.get("files", [])
        preferred = (".mp4", ".m4v", ".webm", ".ogv")
        chosen = None
        for ext in preferred:
            for f in files:
                name = f.get("name", "")
                if name.lower().endswith(ext):
                    chosen = name
                    break
            if chosen:
                break
        if not chosen:
            return None
        return f"{DOWNLOAD}/{video_id}/{chosen}"
