import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  ActivityIndicator,
  Dimensions,
  PanResponder,
} from "react-native";
import { Video, ResizeMode } from "expo-av";
import { Ionicons } from "@expo/vector-icons";
import * as ScreenOrientation from "expo-screen-orientation";
import * as Brightness from "expo-brightness";
import { useKeepAwake } from "expo-keep-awake";

import { colors, spacing, font, radius } from "../theme";
import { api } from "../api";
import { loadSettings } from "../store/settings";

const { width, height } = Dimensions.get("window");

// Demo public-domain fallback so the player always has something to play
// even before a real source resolves a stream.
const FALLBACK_STREAM =
  "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

function fmt(ms) {
  if (!ms || ms < 0) return "0:00";
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? h + ":" : ""}${mm}:${String(s).padStart(2, "0")}`;
}

export default function PlayerScreen({ route, navigation }) {
  const params = route.params;
  const videoRef = useRef(null);
  useKeepAwake();

  const [status, setStatus] = useState({});
  const [streamUrl, setStreamUrl] = useState(null);
  const [resolving, setResolving] = useState(true);
  const [controls, setControls] = useState(true);
  const [subtitleUrl, setSubtitleUrl] = useState(null);
  const [showQuality, setShowQuality] = useState(false);
  const [showSubs, setShowSubs] = useState(false);
  const [quality, setQuality] = useState("auto");
  const [subsOn, setSubsOn] = useState(false);
  const [overlay, setOverlay] = useState(null); // {type, value}
  const controlsTimer = useRef(null);
  const lastSaved = useRef(0);

  // --- landscape lock ---
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    return () => {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
    };
  }, []);

  // --- resolve stream + subtitles from sources ---
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const settings = await loadSettings();
      setQuality(settings.quality);
      setSubsOn(settings.subtitleLang === "he");

      try {
        const search = await api.sourceSearch({
          query: params.seriesTitle || params.title,
          type: params.media_type,
          season: params.season,
          episode: params.episode,
        });
        const first = (search.results || [])[0];
        if (first?.source && first?.video_id) {
          const r = await api.streamUrl(first.source, first.video_id);
          if (!cancelled && r.stream_url) setStreamUrl(r.stream_url);
        }
      } catch {
        /* fall through to fallback */
      }
      if (!cancelled) {
        setStreamUrl((u) => u || FALLBACK_STREAM);
        setResolving(false);
      }

      // Hebrew subtitles (best-effort).
      try {
        const subs = await api.findSubtitles(params.seriesTitle || params.title);
        const heb = (subs.subtitles || []).find((s) => s.language === "he");
        if (heb && !cancelled) {
          const link = await api.subtitleLink(heb.download_url);
          if (link.link) setSubtitleUrl(link.link);
        }
      } catch {
        /* no subtitles found */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // --- progress reporting (every ~5s) + auto-mark watched ---
  const onStatus = useCallback(
    (s) => {
      setStatus(s);
      if (!s.isLoaded || !s.durationMillis) return;
      const now = Date.now();
      if (now - lastSaved.current > 5000) {
        lastSaved.current = now;
        api
          .updateWatch({
            media_type: params.media_type,
            tmdb_id: params.tmdb_id,
            season: params.season ?? null,
            episode: params.episode ?? null,
            title: params.title,
            poster_path: params.poster_path,
            backdrop_path: params.backdrop_path,
            position: s.positionMillis / 1000,
            duration: s.durationMillis / 1000,
          })
          .catch(() => {});
      }
    },
    [params]
  );

  const toggleControls = () => {
    setControls((c) => !c);
  };

  useEffect(() => {
    if (controls) {
      clearTimeout(controlsTimer.current);
      controlsTimer.current = setTimeout(() => setControls(false), 4000);
    }
    return () => clearTimeout(controlsTimer.current);
  }, [controls, status.positionMillis]);

  const seekBy = async (deltaMs) => {
    if (!status.isLoaded) return;
    const pos = Math.max(0, Math.min((status.positionMillis || 0) + deltaMs, status.durationMillis || 0));
    await videoRef.current?.setPositionAsync(pos);
    flashOverlay({ type: deltaMs > 0 ? "forward" : "back", value: `${Math.abs(deltaMs / 1000)}±` });
  };

  const flashOverlay = (o) => {
    setOverlay(o);
    setTimeout(() => setOverlay(null), 700);
  };

  const togglePlay = async () => {
    if (!status.isLoaded) return;
    if (status.isPlaying) await videoRef.current?.pauseAsync();
    else await videoRef.current?.playAsync();
  };

  // --- gesture: double-tap seek (left/right), vertical swipe brightness/volume ---
  const lastTap = useRef(0);
  const startVol = useRef(0);
  const startBright = useRef(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 8,
      onPanResponderGrant: async (e) => {
        startVol.current = status.volume ?? 1;
        try {
          startBright.current = await Brightness.getBrightnessAsync();
        } catch {
          startBright.current = 0.5;
        }
      },
      onPanResponderMove: async (e, g) => {
        const x = e.nativeEvent.pageX;
        const delta = -g.dy / height; // up = increase
        if (x < width / 2) {
          // left half -> brightness
          const b = Math.max(0, Math.min(startBright.current + delta, 1));
          try {
            await Brightness.setBrightnessAsync(b);
          } catch {}
          setOverlay({ type: "brightness", value: `${Math.round(b * 100)}%` });
        } else {
          // right half -> volume
          const v = Math.max(0, Math.min(startVol.current + delta, 1));
          await videoRef.current?.setVolumeAsync(v);
          setOverlay({ type: "volume", value: `${Math.round(v * 100)}%` });
        }
      },
      onPanResponderRelease: (e, g) => {
        if (Math.abs(g.dx) < 6 && Math.abs(g.dy) < 6) {
          const now = Date.now();
          if (now - lastTap.current < 300) {
            // double tap
            if (e.nativeEvent.locationX < width / 2) seekBy(-10000);
            else seekBy(10000);
          } else {
            toggleControls();
          }
          lastTap.current = now;
        }
        setTimeout(() => setOverlay(null), 500);
      },
    })
  ).current;

  const duration = status.durationMillis || 0;
  const position = status.positionMillis || 0;
  const progress = duration > 0 ? position / duration : 0;
  const nearEnd = duration > 0 && position / duration > 0.92;

  const goNextEpisode = () => {
    if (params.media_type !== "tv") return;
    navigation.replace("Player", {
      ...params,
      episode: (params.episode || 1) + 1,
      title: `${params.seriesTitle} - פרק ${(params.episode || 1) + 1}`,
    });
  };

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      {streamUrl ? (
        <Video
          ref={videoRef}
          source={{ uri: streamUrl }}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.CONTAIN}
          shouldPlay
          onPlaybackStatusUpdate={onStatus}
        />
      ) : null}

      {(resolving || !status.isLoaded) && (
        <View style={styles.loading}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.loadingText}>טוען סרטון...</Text>
        </View>
      )}

      {/* gesture overlay indicator */}
      {overlay && (
        <View style={styles.overlayBadge} pointerEvents="none">
          <Ionicons
            name={
              overlay.type === "brightness"
                ? "sunny"
                : overlay.type === "volume"
                ? "volume-high"
                : overlay.type === "forward"
                ? "play-forward"
                : "play-back"
            }
            size={28}
            color="#fff"
          />
          <Text style={styles.overlayText}>{overlay.value}</Text>
        </View>
      )}

      {controls && (
        <View style={styles.controls} pointerEvents="box-none">
          {/* top bar */}
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="chevron-down" size={30} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.titleText} numberOfLines={1}>
              {params.title}
            </Text>
            <View style={styles.topRight}>
              <TouchableOpacity onPress={() => setShowSubs((v) => !v)}>
                <Ionicons name="chatbox-ellipses-outline" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowQuality((v) => !v)} style={{ marginStart: spacing.lg }}>
                <Ionicons name="settings-outline" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>

          {/* center play/pause + seek */}
          <View style={styles.center}>
            <TouchableOpacity onPress={() => seekBy(-10000)}>
              <Ionicons name="play-back" size={36} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={togglePlay} style={styles.playBig}>
              <Ionicons name={status.isPlaying ? "pause" : "play"} size={48} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => seekBy(10000)}>
              <Ionicons name="play-forward" size={36} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* bottom bar: seek bar + time */}
          <View style={styles.bottomBar}>
            <Text style={styles.time}>{fmt(position)}</Text>
            <View style={styles.seekTrack}>
              <View style={[styles.seekFill, { width: `${progress * 100}%` }]} />
            </View>
            <Text style={styles.time}>{fmt(duration)}</Text>
          </View>
        </View>
      )}

      {/* next episode button */}
      {nearEnd && params.media_type === "tv" && (
        <TouchableOpacity style={styles.nextEpisode} onPress={goNextEpisode}>
          <Text style={styles.nextEpisodeText}>הפרק הבא</Text>
          <Ionicons name="play-skip-forward" size={18} color="#000" />
        </TouchableOpacity>
      )}

      {/* quality selector */}
      {showQuality && (
        <View style={styles.menu}>
          <Text style={styles.menuTitle}>איכות</Text>
          {["auto", "1080p", "720p", "480p"].map((q) => (
            <TouchableOpacity key={q} style={styles.menuItem} onPress={() => { setQuality(q); setShowQuality(false); }}>
              <Text style={[styles.menuItemText, quality === q && styles.menuItemActive]}>
                {q === "auto" ? "אוטומטי" : q}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* subtitle selector */}
      {showSubs && (
        <View style={styles.menu}>
          <Text style={styles.menuTitle}>כתוביות</Text>
          <TouchableOpacity style={styles.menuItem} onPress={() => { setSubsOn(true); setShowSubs(false); }}>
            <Text style={[styles.menuItemText, subsOn && styles.menuItemActive]}>
              עברית {subtitleUrl ? "" : "(לא נמצאו)"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.menuItem} onPress={() => { setSubsOn(false); setShowSubs(false); }}>
            <Text style={[styles.menuItemText, !subsOn && styles.menuItemActive]}>ללא</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  loading: { ...StyleSheet.absoluteFillObject, alignItems: "center", justifyContent: "center" },
  loadingText: { color: "#fff", marginTop: spacing.md, fontSize: font.body },
  controls: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "space-between" },
  topBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    padding: spacing.lg,
    gap: spacing.md,
  },
  titleText: { color: "#fff", fontSize: font.subtitle, fontWeight: "700", flex: 1, textAlign: "right" },
  topRight: { flexDirection: "row-reverse", alignItems: "center" },
  center: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: spacing.xxl },
  playBig: { padding: spacing.md },
  bottomBar: { flexDirection: "row-reverse", alignItems: "center", padding: spacing.lg, gap: spacing.md },
  time: { color: "#fff", fontSize: font.small, width: 52, textAlign: "center" },
  seekTrack: { flex: 1, height: 4, backgroundColor: colors.progressTrack, borderRadius: 2 },
  seekFill: { height: "100%", backgroundColor: colors.accent, borderRadius: 2 },
  overlayBadge: {
    position: "absolute",
    alignSelf: "center",
    top: height / 2 - 40,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: "center",
  },
  overlayText: { color: "#fff", fontSize: font.body, marginTop: 4, fontWeight: "700" },
  nextEpisode: {
    position: "absolute",
    bottom: spacing.xxl + 40,
    insetInlineStart: spacing.lg,
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: "#fff",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  nextEpisodeText: { color: "#000", fontWeight: "800", fontSize: font.body },
  menu: {
    position: "absolute",
    top: 50,
    insetInlineStart: spacing.lg,
    backgroundColor: "rgba(20,20,20,0.95)",
    borderRadius: radius.md,
    padding: spacing.md,
    minWidth: 160,
    borderWidth: 1,
    borderColor: colors.border,
  },
  menuTitle: { color: colors.textMuted, fontSize: font.small, marginBottom: spacing.sm, textAlign: "right" },
  menuItem: { paddingVertical: spacing.sm },
  menuItemText: { color: "#fff", fontSize: font.body, textAlign: "right" },
  menuItemActive: { color: colors.accent, fontWeight: "800" },
});
