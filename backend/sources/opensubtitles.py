"""OpenSubtitles source — fetches Hebrew subtitles.

Uses the REST API (api.opensubtitles.com). Requires OPENSUBTITLES_API_KEY;
without it returns []. Implements BaseSource so it can live in the registry,
but its real job is `find_subtitles`.
"""
import logging
from typing import Optional

import httpx

from config import settings
from .base import BaseSource, SubtitleResult, VideoResult

log = logging.getLogger("mytv.source.opensubtitles")

API = "https://api.opensubtitles.com/api/v1"


class OpenSubtitlesSource(BaseSource):
    name = "opensubtitles"
    provides_subtitles = True

    def _headers(self) -> dict:
        return {
            "Api-Key": settings.opensubtitles_api_key,
            "User-Agent": settings.opensubtitles_user_agent,
            "Content-Type": "application/json",
        }

    async def find_subtitles(self, title, language="he", file_hash=None) -> list[SubtitleResult]:
        if not settings.opensubtitles_api_key:
            log.warning("OPENSUBTITLES_API_KEY missing — skipping subtitle search")
            return []

        params: dict = {"languages": language}
        if file_hash:
            params["moviehash"] = file_hash
        else:
            params["query"] = title

        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(f"{API}/subtitles", params=params, headers=self._headers())
                resp.raise_for_status()
                data = resp.json()
        except httpx.HTTPError as e:
            log.error("OpenSubtitles search failed: %s", e)
            return []

        results = []
        for item in data.get("data", []):
            attrs = item.get("attributes", {})
            files = attrs.get("files", [])
            if not files:
                continue
            file_id = files[0].get("file_id")
            results.append(
                SubtitleResult(
                    source=self.name,
                    language=attrs.get("language", language),
                    name=attrs.get("release") or attrs.get("feature_details", {}).get("title", title),
                    download_url=f"file_id:{file_id}",  # resolved on demand via download()
                    format="srt",
                )
            )
        return results

    async def download(self, file_id: str) -> Optional[str]:
        """Exchange a file_id for a temporary direct download link."""
        if not settings.opensubtitles_api_key:
            return None
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.post(
                    f"{API}/download",
                    headers=self._headers(),
                    json={"file_id": int(file_id)},
                )
                resp.raise_for_status()
                return resp.json().get("link")
        except (httpx.HTTPError, ValueError) as e:
            log.error("OpenSubtitles download failed: %s", e)
            return None

    # Not a video source, but satisfy the interface.
    async def search(self, query, type="all", season=None, episode=None, imdb_id=None) -> list[VideoResult]:
        return []

    async def get_stream_url(self, video_id: str) -> Optional[str]:
        return None
