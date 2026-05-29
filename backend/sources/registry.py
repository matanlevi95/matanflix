"""Source registry — instantiates the sources listed in sources_config.py.

The rest of the app talks to the registry, never to individual sources, so
adding/removing a source never touches business logic.
"""
import asyncio
import logging

from .base import BaseSource, VideoResult, SubtitleResult

log = logging.getLogger("mytv.registry")


class SourceRegistry:
    def __init__(self, sources: list[BaseSource]):
        self._sources = {s.name: s for s in sources}
        log.info("Loaded sources: %s", ", ".join(self._sources) or "(none)")

    @property
    def names(self) -> list[str]:
        return list(self._sources)

    def get(self, name: str) -> BaseSource | None:
        return self._sources.get(name)

    @property
    def video_sources(self) -> list[BaseSource]:
        return [s for s in self._sources.values() if not s.provides_subtitles]

    @property
    def subtitle_sources(self) -> list[BaseSource]:
        return [s for s in self._sources.values() if s.provides_subtitles]

    async def search_all(self, query, type="all", season=None, episode=None) -> list[dict]:
        async def _run(src: BaseSource):
            try:
                return await src.search(query, type, season, episode)
            except Exception as e:  # one bad source must not break the rest
                log.error("Source %s failed: %s", src.name, e)
                return []

        groups = await asyncio.gather(*[_run(s) for s in self.video_sources])
        out: list[dict] = []
        for results in groups:
            out.extend(r.to_dict() for r in results)
        return out

    async def get_stream_url(self, source: str, video_id: str) -> str | None:
        src = self.get(source)
        if not src:
            return None
        return await src.get_stream_url(video_id)

    async def find_subtitles(self, title, language="he", file_hash=None) -> list[dict]:
        out: list[dict] = []
        for src in self.subtitle_sources:
            try:
                subs = await src.find_subtitles(title, language, file_hash)
                out.extend(s.to_dict() for s in subs)
            except Exception as e:
                log.error("Subtitle source %s failed: %s", src.name, e)
        return out


_registry: SourceRegistry | None = None


def get_registry() -> SourceRegistry:
    global _registry
    if _registry is None:
        from sources_config import ENABLED_SOURCES  # local import avoids cycle
        _registry = SourceRegistry([cls() for cls in ENABLED_SOURCES])
    return _registry
