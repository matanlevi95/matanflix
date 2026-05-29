"""Subtitle endpoints — find Hebrew subtitles, resolve a download link."""
from fastapi import APIRouter

from sources import get_registry
from sources.opensubtitles import OpenSubtitlesSource

router = APIRouter(prefix="/api/subtitles", tags=["subtitles"])


@router.get("/find")
async def find(title: str, hash: str | None = None, lang: str = "he"):
    reg = get_registry()
    subs = await reg.find_subtitles(title, lang, hash)
    return {"count": len(subs), "subtitles": subs}


@router.get("/download")
async def download(file_id: str):
    """Resolve an OpenSubtitles file_id to a temporary direct link."""
    reg = get_registry()
    src = reg.get("opensubtitles")
    link = None
    if isinstance(src, OpenSubtitlesSource):
        clean = file_id.replace("file_id:", "")
        link = await src.download(clean)
    return {"file_id": file_id, "link": link}
