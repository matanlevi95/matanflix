"""Pluggable content-source interface.

Every legal source implements `BaseSource`. The registry loads all configured
sources from `sources_config.py`; adding a new one is a single import line.
"""
from dataclasses import dataclass, field, asdict
from typing import Optional


@dataclass
class VideoResult:
    source: str                       # source name, e.g. "youtube"
    video_id: str                     # opaque id within the source
    title: str
    stream_url: Optional[str] = None  # direct/embed URL when known up-front
    thumbnail: Optional[str] = None
    duration: Optional[int] = None    # seconds
    quality: Optional[str] = None
    description: str = ""
    extra: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return asdict(self)


@dataclass
class SubtitleResult:
    source: str
    language: str          # ISO code, e.g. "he"
    name: str
    download_url: str
    format: str = "srt"

    def to_dict(self) -> dict:
        return asdict(self)


class BaseSource:
    """Subclasses set `name` and implement `search` / `get_stream_url`."""

    name: str = "base"
    provides_subtitles: bool = False

    async def search(
        self,
        query: str,
        type: str = "all",
        season: Optional[int] = None,
        episode: Optional[int] = None,
    ) -> list[VideoResult]:
        raise NotImplementedError

    async def get_stream_url(self, video_id: str) -> Optional[str]:
        raise NotImplementedError

    async def find_subtitles(
        self, title: str, language: str = "he", file_hash: Optional[str] = None
    ) -> list[SubtitleResult]:
        return []
