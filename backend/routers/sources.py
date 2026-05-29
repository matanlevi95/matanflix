"""Content-source endpoints — search across all sources, resolve stream URL."""
from fastapi import APIRouter
from pydantic import BaseModel

from sources import get_registry

router = APIRouter(prefix="/api/sources", tags=["sources"])


class SourceSearchBody(BaseModel):
    query: str
    type: str = "all"
    season: int | None = None
    episode: int | None = None


@router.get("/list")
async def list_sources():
    reg = get_registry()
    return {"sources": reg.names}


@router.post("/search")
async def search(body: SourceSearchBody):
    reg = get_registry()
    results = await reg.search_all(body.query, body.type, body.season, body.episode)
    return {"count": len(results), "results": results}


@router.get("/stream")
async def stream(source: str, video_id: str):
    reg = get_registry()
    url = await reg.get_stream_url(source, video_id)
    return {"source": source, "video_id": video_id, "stream_url": url}
