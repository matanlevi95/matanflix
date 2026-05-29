"""MyTV backend — FastAPI app entrypoint."""
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from database import init_db, close_db, cache_clear
from sources import get_registry
from routers import metadata, sources, subtitles, watchlist, watch_history

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
log = logging.getLogger("mytv")


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    get_registry()  # eager-load sources so failures show at boot
    log.info("Matanflix backend ready on %s:%s", settings.host, settings.port)
    yield
    await close_db()


app = FastAPI(title="Matanflix", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(metadata.router)
app.include_router(sources.router)
app.include_router(subtitles.router)
app.include_router(watchlist.router)
app.include_router(watch_history.router)


@app.get("/")
async def root():
    return {"name": "Matanflix", "status": "ok", "tmdb_configured": bool(settings.tmdb_api_key)}


@app.get("/api/health")
async def health():
    return {"status": "ok", "sources": get_registry().names}


@app.post("/api/cache/clear")
async def clear_cache():
    n = await cache_clear()
    return {"cleared": n}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host=settings.host, port=settings.port, reload=True)
