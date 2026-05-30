"""Stremio Addon Protocol source.

Stremio is an open protocol: addons are plain HTTP services that expose a
manifest plus catalog / meta / stream endpoints. This source queries one or
more configured addons:

  * catalog search  -> "search in Stremio" (browse results by title)
  * stream lookup   -> playable streams for a given IMDB id (+ season/episode)

Defaults to the official **Cinemeta** addon (legal catalog/metadata). Add
stream-capable addon URLs via STREMIO_ADDONS to get playable links. Only
direct http(s) streams (and YouTube ids) are returned — torrent/magnet
results are skipped so playback stays direct and legal.

Docs: https://github.com/Stremio/stremio-addon-sdk/blob/master/docs/api/
"""
import asyncio
import logging
from typing import Optional

import httpx

from config import settings
from .base import BaseSource, VideoResult

log = logging.getLogger("mytv.source.stremio")

# Stremio content types we map to. TMDB "tv" == Stremio "series".
_TYPE_MAP = {"movie": "movie", "tv": "series", "series": "series"}


class StremioSource(BaseSource):
    name = "stremio"

    def __init__(self):
        self._addons = [a.rstrip("/").removesuffix("/manifest.json") for a in settings.stremio_addon_list]
        self._manifests: dict[str, dict] = {}

    # ------------------------------- manifest -------------------------------

    async def _manifest(self, client: httpx.AsyncClient, base: str) -> Optional[dict]:
        if base in self._manifests:
            return self._manifests[base]
        try:
            resp = await client.get(f"{base}/manifest.json")
            resp.raise_for_status()
            man = resp.json()
            self._manifests[base] = man
            return man
        except (httpx.HTTPError, ValueError) as e:
            log.warning("Stremio manifest failed for %s: %s", base, e)
            return None

    @staticmethod
    def _supports(manifest: dict, resource: str) -> bool:
        for r in manifest.get("resources", []):
            if r == resource or (isinstance(r, dict) and r.get("name") == resource):
                return True
        return False

    @staticmethod
    def _searchable_catalogs(manifest: dict, stremio_type: str) -> list[str]:
        out = []
        for cat in manifest.get("catalogs", []):
            if cat.get("type") != stremio_type:
                continue
            extra = cat.get("extra", [])
            names = {e.get("name") for e in extra} if extra else set(cat.get("extraSupported", []))
            if "search" in names or not extra:
                out.append(cat.get("id"))
        return out

    # -------------------------------- search --------------------------------

    async def search(self, query, type="all", season=None, episode=None, imdb_id=None) -> list[VideoResult]:
        if not self._addons:
            return []
        stremio_types = [_TYPE_MAP[type]] if type in _TYPE_MAP else ["movie", "series"]

        async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
            tasks = []
            for idx, base in enumerate(self._addons):
                man = await self._manifest(client, base)
                if not man:
                    continue
                for st in stremio_types:
                    # Playable streams when we know the IMDB id.
                    if imdb_id and self._supports(man, "stream"):
                        tasks.append(self._streams(client, idx, base, st, imdb_id, season, episode))
                    # Catalog search (browse by title).
                    if query and self._supports(man, "catalog"):
                        for cid in self._searchable_catalogs(man, st):
                            tasks.append(self._catalog_search(client, idx, base, st, cid, query))
            groups = await asyncio.gather(*tasks, return_exceptions=True)

        results: list[VideoResult] = []
        for g in groups:
            if isinstance(g, list):
                results.extend(g)
        return results

    async def _catalog_search(self, client, idx, base, stremio_type, catalog_id, query) -> list[VideoResult]:
        # Stremio encodes the search term inside the path segment.
        from urllib.parse import quote
        url = f"{base}/catalog/{stremio_type}/{catalog_id}/search={quote(query)}.json"
        try:
            resp = await client.get(url)
            resp.raise_for_status()
            metas = resp.json().get("metas", [])
        except (httpx.HTTPError, ValueError):
            return []
        out = []
        for m in metas[:15]:
            out.append(
                VideoResult(
                    source=self.name,
                    video_id=f"{idx}|meta|{stremio_type}|{m.get('id')}",
                    title=m.get("name", ""),
                    thumbnail=m.get("poster"),
                    description=(m.get("description") or "")[:400],
                    quality="catalog",
                    extra={
                        "imdb_id": m.get("imdb_id") or m.get("id"),
                        "type": stremio_type,
                        "year": m.get("releaseInfo") or m.get("year"),
                        "addon": base,
                    },
                )
            )
        return out

    async def _streams(self, client, idx, base, stremio_type, imdb_id, season, episode) -> list[VideoResult]:
        content_id = imdb_id
        if stremio_type == "series" and season and episode:
            content_id = f"{imdb_id}:{season}:{episode}"
        url = f"{base}/stream/{stremio_type}/{content_id}.json"
        try:
            resp = await client.get(url)
            resp.raise_for_status()
            streams = resp.json().get("streams", [])
        except (httpx.HTTPError, ValueError):
            return []

        out = []
        for s_idx, s in enumerate(streams[:15]):
            playable = self._playable_url(s)
            if not playable:
                continue  # skip torrents / magnets — keep playback direct & legal
            title = s.get("name") or s.get("title") or "Stremio stream"
            out.append(
                VideoResult(
                    source=self.name,
                    video_id=f"{idx}|stream|{stremio_type}|{content_id}|{s_idx}",
                    title=title.replace("\n", " ")[:120],
                    stream_url=playable,
                    quality=(s.get("name") or "").split("\n")[0][:20] or "auto",
                    description=s.get("title", ""),
                    extra={"addon": base},
                )
            )
        return out

    @staticmethod
    def _playable_url(stream: dict) -> Optional[str]:
        if stream.get("url"):
            return stream["url"]
        if stream.get("ytId"):
            return f"https://www.youtube.com/watch?v={stream['ytId']}"
        external = (stream.get("behaviorHints") or {}).get("externalUrl") if stream.get("externalUrl") else None
        return stream.get("externalUrl") or external

    # ------------------------------ resolve ---------------------------------

    async def get_stream_url(self, video_id: str) -> Optional[str]:
        parts = video_id.split("|")
        if len(parts) < 4 or parts[1] != "stream":
            return None
        idx, _, stremio_type, content_id = parts[0], parts[1], parts[2], parts[3]
        s_idx = int(parts[4]) if len(parts) > 4 else 0
        try:
            base = self._addons[int(idx)]
        except (ValueError, IndexError):
            return None
        url = f"{base}/stream/{stremio_type}/{content_id}.json"
        try:
            async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                streams = resp.json().get("streams", [])
        except (httpx.HTTPError, ValueError):
            return None
        playable = [self._playable_url(s) for s in streams]
        playable = [p for p in playable if p]
        if s_idx < len(playable):
            return playable[s_idx]
        return playable[0] if playable else None
