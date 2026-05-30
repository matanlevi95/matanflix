"""Source configuration.

Adding a new content source is ONE import line plus one list entry:

    from sources.my_new_source import MyNewSource
    ENABLED_SOURCES = [..., MyNewSource]

The registry instantiates everything listed here at startup.
"""
from sources.youtube import YouTubeSource
from sources.archive import ArchiveSource
from sources.opensubtitles import OpenSubtitlesSource
from sources.stremio import StremioSource

ENABLED_SOURCES = [
    StremioSource,
    YouTubeSource,
    ArchiveSource,
    OpenSubtitlesSource,
]
