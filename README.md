# Matanflix 🎬

A legal media-center app (in the spirit of Plex / Stremio / Kodi) with a **full Hebrew, RTL, Netflix-dark UI**.

- **Frontend:** React Native + Expo (managed workflow)
- **Backend:** Python FastAPI
- **Database:** SQLite (server-side)
- **Metadata:** TMDB in Hebrew (`he-IL`), cached 24h
- **Content:** pluggable *legal* sources — Stremio addons, YouTube, Internet Archive, OpenSubtitles
- **Streaming is direct** (the device plays the source URL); the server only does metadata, search, and subtitle lookup — it never proxies video.

```
matanflix/
├── backend/          FastAPI server
│   ├── main.py           app + routes wiring
│   ├── tmdb.py           TMDB client (he-IL, cached) + demo fallback
│   ├── database.py       SQLite (favorites / watch_history / metadata_cache)
│   ├── sources/          pluggable source system (base + registry)
│   ├── sources_config.py  ← enable a source by adding one import line
│   └── routers/          metadata, sources, subtitles, watchlist, watch-history
├── frontend/         Expo app
│   └── src/
│       ├── screens/      Home, Search, SeriesDetail, MovieDetail, Player, Favorites, Settings
│       ├── components/   HeroBanner, ContentRow, PosterCard, FavoriteButton, common
│       ├── navigation/   bottom tabs + stack
│       ├── api.js        backend client (runtime-configurable base URL)
│       └── theme.js      Netflix-dark palette
├── render.yaml       one-click Render.com deploy
├── docker-compose.yml
└── scripts/build-apk.sh
```

## 1. Backend

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # add your API keys (all optional)
uvicorn main:app --reload   # http://localhost:8000  (docs at /docs)
```

**Keys are optional.** With no `TMDB_API_KEY` the app serves built-in **demo content** so the whole UI renders. Internet Archive search/streaming works with no key at all. Add keys in `.env` to go live:

| Key | Used for | Get it |
|-----|----------|--------|
| `TMDB_API_KEY` | All metadata (Hebrew) | themoviedb.org/settings/api |
| `YOUTUBE_API_KEY` | YouTube source | console.cloud.google.com |
| `OPENSUBTITLES_API_KEY` | Hebrew subtitles | opensubtitles.com/consumers |
| `STREMIO_ADDONS` | Stremio addon URLs (comma-sep) | defaults to Cinemeta |

### Stremio

The Stremio source speaks the open [Stremio Addon Protocol](https://github.com/Stremio/stremio-addon-sdk). By default it searches the official **Cinemeta** catalog (`search in Stremio`). Point `STREMIO_ADDONS` at any stream-capable addon's URL to get playable streams — only direct `http(s)` streams are returned, torrent/magnet links are skipped.

### Docker

```bash
docker compose up --build           # backend on :8000
docker compose --profile dev up     # + nginx proxy on :8080
```

## 2. Frontend

```bash
cd frontend
npm install
npx expo start          # press 'a' for Android, 'i' for iOS
```

The backend URL is set in **Settings → כתובת שרת** at runtime (handy after deploying to Render), or as the default in `app.json → extra.apiBaseUrl`. On the Android emulator the host is `http://10.0.2.2:8000`.

### Build a signed APK (Android 8+ / API 26+)

```bash
./scripts/build-apk.sh         # cloud build via EAS (managed keystore)
./scripts/build-apk.sh local   # local Gradle build (needs Android SDK + JDK 17)
```

## 3. Deploy the backend to Render.com (free tier)

The repo ships a `render.yaml` blueprint.

1. Push this repo to GitHub.
2. Render dashboard → **New → Blueprint** → pick the repo.
3. After the first deploy, fill the API keys (`TMDB_API_KEY`, …) in the service's **Environment** tab.
4. Copy the service URL (e.g. `https://matanflix.onrender.com`) into the app's **Settings → כתובת שרת**.

Video never flows through Render — the backend only returns metadata, search results, and subtitle links; playback streams directly from the source to the device.

## Adding a content source

Implement `BaseSource` (see `backend/sources/base.py`), then add **one line** to `backend/sources_config.py`:

```python
from sources.my_source import MySource
ENABLED_SOURCES = [..., MySource]
```

The registry auto-loads it for `/api/sources/search`.

## Legality

Matanflix aggregates **legal** content only: TMDB metadata, public-domain / freely-licensed video (Internet Archive), public YouTube videos, and OpenSubtitles. It ships no pirated content and proxies no streams.
