"""Demo content used ONLY when no TMDB_API_KEY is configured.

Lets the app render a full Netflix-style UI for previews/development without
any API keys. Images come from picsum.photos (seeded, always loads). As soon
as a real TMDB key is set, this module is bypassed entirely.
"""

_HE_TITLES = {
    "series": [
        "פאודה", "שטיסל", "הבורר", "טהרן", "החיים על פי אגי",
        "זגורי אימפריה", "סרוגים", "מתומתמת", "בני ערובה", "כבודו",
    ],
    "movie": [
        "ביקור התזמורת", "אפס ביחסי אנוש", "הערת שוליים", "ללכת על המים",
        "הבועה", "וולס עם באשיר", "לבנון", "מאדים", "אושפיזין", "נע ונד",
    ],
}

_OVERVIEW = (
    "תקציר לדוגמה לתצוגה מקדימה של הממשק. כאן יופיע התיאור המלא בעברית מתוך TMDB "
    "לאחר הגדרת מפתח API."
)
_GENRES = ["דרמה", "מתח", "אקשן"]


def _img(seed: int, w: int, h: int) -> str:
    return f"https://picsum.photos/seed/mytv{seed}/{w}/{h}"


def _card(i: int, media_type: str) -> dict:
    titles = _HE_TITLES["series" if media_type == "tv" else "movie"]
    title = titles[i % len(titles)]
    return {
        "tmdb_id": 1000 * (1 if media_type == "tv" else 2) + i,
        "media_type": media_type,
        "title": title,
        "overview": _OVERVIEW,
        "poster_path": None,
        "backdrop_path": None,
        "poster_url": _img(i + (50 if media_type == "tv" else 0), 500, 750),
        "backdrop_url": _img(i + (50 if media_type == "tv" else 0), 1280, 720),
        "rating": round(6.5 + (i % 4) * 0.7, 1),
        "year": str(2016 + (i % 9)),
    }


def cards(media_type: str, n: int = 10, offset: int = 0) -> list[dict]:
    return [_card(i + offset, media_type) for i in range(n)]


def hero() -> list[dict]:
    return cards("movie", 3) + cards("tv", 3, offset=3)


def detail(media_type: str, tmdb_id: int) -> dict:
    base = _card(tmdb_id % 10, media_type)
    base["tmdb_id"] = tmdb_id
    detail = {
        **base,
        "genres": _GENRES,
        "cast": [
            {"name": f"שחקן {k + 1}", "character": f"דמות {k + 1}", "profile_url": _img(200 + k, 185, 185)}
            for k in range(6)
        ],
        "director": "במאי לדוגמה",
        "similar": cards(media_type, 6, offset=4),
        "status": "Released",
    }
    if media_type == "movie":
        detail["runtime"] = 118
    else:
        detail["number_of_seasons"] = 2
        detail["number_of_episodes"] = 16
        detail["seasons"] = [
            {"season_number": s, "name": f"עונה {s}", "episode_count": 8, "poster_url": base["poster_url"]}
            for s in (1, 2)
        ]
    return detail


def seasons(tmdb_id: int) -> dict:
    return {
        "tmdb_id": tmdb_id,
        "title": "סדרה לדוגמה",
        "seasons": [
            {
                "season_number": s,
                "name": f"עונה {s}",
                "episodes": [
                    {
                        "episode_number": e,
                        "name": f"פרק {e}",
                        "overview": _OVERVIEW,
                        "still_url": _img(300 + s * 10 + e, 300, 170),
                        "air_date": f"202{s}-0{e if e < 10 else 1}-01",
                        "runtime": 45,
                        "rating": round(7 + (e % 3) * 0.5, 1),
                    }
                    for e in range(1, 9)
                ],
            }
            for s in (1, 2)
        ],
    }


def search(query: str, media_type: str = "all") -> list[dict]:
    out = []
    if media_type in ("all", "movie"):
        out += cards("movie", 6)
    if media_type in ("all", "tv", "series"):
        out += cards("tv", 6)
    # echo the query into the first title so it feels responsive
    if out:
        out[0] = {**out[0], "title": f"{query} (תוצאת דמו)"}
    return out
