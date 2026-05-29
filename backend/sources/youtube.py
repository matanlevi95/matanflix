"""YouTube Data API v3 source — searches public videos.

Legal: only indexes publicly listed YouTube videos and returns the standard
watch URL. Requires YOUTUBE_API_KEY; without it search returns [].
"""
import logging
from typing import Optional

import httpx

from config import settings
from .base import BaseSource, VideoResult

log = logging.getLogger("mytv.source.youtube")

API = "https://www.googleapis.com/youtube/v3"


class YouTubeSource(BaseSource):
    name = "youtube"

    async def search(self, query, type="all", season=None, episode=None) -> list[VideoResult]:
        if not settings.youtube_api_key:
            log.warning("YOUTUBE_API_KEY missing — skipping YouTube search")
            return []

        q = query
        if season and episode:
            q = f"{query} S{season:02d}E{episode:02d}"

        params = {
            "part": "snippet",
            "q": q,
            "type": "video",
            "maxResults": 15,
            "videoEmbeddable": "true",
            "key": settings.youtube_api_key,
        }
        try:
            async with httpx.AsyncClient(timeout=15) as client:
                resp = await client.get(f"{API}/search", params=params)
                resp.raise_for_status()
                data = resp.json()
        except httpx.HTTPError as e:
            log.error("YouTube search failed: %s", e)
            return []

        results = []
        for item in data.get("items", []):
            vid = item.get("id", {}).get("videoId")
            if not vid:
                continue
            snip = item.get("snippet", {})
            thumbs = snip.get("thumbnails", {})
            results.append(
                VideoResult(
                    source=self.name,
                    video_id=vid,
                    title=snip.get("title", ""),
                    stream_url=f"https://www.youtube.com/watch?v={vid}",
                    thumbnail=(thumbs.get("high") or thumbs.get("default") or {}).get("url"),
                    description=snip.get("description", ""),
                    quality="auto",
                    extra={"channel": snip.get("channelTitle")},
                )
            )
        return results

    async def get_stream_url(self, video_id: str) -> Optional[str]:
        return f"https://www.youtube.com/watch?v={video_id}"
