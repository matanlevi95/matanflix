import React, { useEffect, useMemo, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { colors, spacing, font, radius } from "../theme";
import { api } from "../api";
import { Loading, Pill } from "../components/common";
import FavoriteButton from "../components/FavoriteButton";
import ContentRow from "../components/ContentRow";

const { width } = Dimensions.get("window");
const STILL = "https://via.placeholder.com/300x170/2A2A2A/7A7A7A?text=?";

export default function SeriesDetailScreen({ route, navigation }) {
  const { id, preview } = route.params;
  const [series, setSeries] = useState(preview || null);
  const [seasons, setSeasons] = useState([]);
  const [progress, setProgress] = useState({}); // "s-e" -> record
  const [activeSeason, setActiveSeason] = useState(1);
  const [loading, setLoading] = useState(true);
  const [seasonsLoading, setSeasonsLoading] = useState(true);

  useEffect(() => {
    api
      .details("tv", id)
      .then((d) => {
        setSeries((prev) => ({ ...prev, ...d }));
        if (d.seasons?.length) setActiveSeason(d.seasons[0].season_number);
      })
      .catch(() => {})
      .finally(() => setLoading(false));

    api
      .seasons(id)
      .then((d) => setSeasons(d.seasons || []))
      .catch(() => {})
      .finally(() => setSeasonsLoading(false));

    api.episodeProgress(id).then(setProgress).catch(() => {});
  }, [id]);

  const currentSeason = useMemo(
    () => seasons.find((s) => s.season_number === activeSeason),
    [seasons, activeSeason]
  );

  // Find the next episode to watch (first unwatched across seasons).
  const nextEpisode = useMemo(() => {
    for (const s of seasons) {
      for (const e of s.episodes) {
        const rec = progress[`${s.season_number}-${e.episode_number}`];
        if (!rec || !rec.watched) {
          return { season: s.season_number, episode: e.episode_number, name: e.name };
        }
      }
    }
    return null;
  }, [seasons, progress]);

  if (loading && !series?.title) return <Loading />;
  if (!series) return <Loading />;

  const backdrop = series.backdrop_url || `https://image.tmdb.org/t/p/w1280${series.backdrop_path}`;

  const playEpisode = (season, episode, name) =>
    navigation.navigate("Player", {
      media_type: "tv",
      tmdb_id: series.tmdb_id,
      imdb_id: series.imdb_id,
      season,
      episode,
      title: `${series.title} - ${name || `פרק ${episode}`}`,
      seriesTitle: series.title,
      poster_path: series.poster_path,
      backdrop_path: series.backdrop_path,
    });

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
      <View style={styles.backdropWrap}>
        <Image source={{ uri: backdrop }} style={styles.backdrop} resizeMode="cover" />
        <LinearGradient
          colors={["rgba(20,20,20,0.2)", "transparent", colors.background]}
          style={StyleSheet.absoluteFill}
        />
        <TouchableOpacity style={styles.back} onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-forward" size={28} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <Text style={styles.title}>{series.title}</Text>
        <View style={styles.metaRow}>
          {series.year ? <Text style={styles.meta}>{series.year}</Text> : null}
          {series.number_of_seasons ? (
            <Text style={styles.meta}>{series.number_of_seasons} עונות</Text>
          ) : null}
          {series.rating > 0 ? (
            <Text style={styles.rating}>★ {Number(series.rating).toFixed(1)}</Text>
          ) : null}
        </View>

        {series.genres?.length > 0 && (
          <View style={styles.pills}>
            {series.genres.map((g) => (
              <Pill key={g} label={g} />
            ))}
          </View>
        )}

        {nextEpisode && (
          <TouchableOpacity
            style={styles.nextButton}
            onPress={() => playEpisode(nextEpisode.season, nextEpisode.episode, nextEpisode.name)}
          >
            <Ionicons name="play" size={22} color="#000" />
            <Text style={styles.nextText}>
              הפרק הבא לצפייה · עונה {nextEpisode.season} פרק {nextEpisode.episode}
            </Text>
          </TouchableOpacity>
        )}

        <View style={{ marginTop: spacing.md }}>
          <FavoriteButton item={{ ...series, media_type: "tv" }} />
        </View>

        {series.overview ? <Text style={styles.overview}>{series.overview}</Text> : null}

        {/* Season selector */}
        {seasons.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.seasonTabs}
            contentContainerStyle={{ gap: spacing.sm }}
          >
            {seasons.map((s) => (
              <TouchableOpacity
                key={s.season_number}
                style={[styles.seasonTab, activeSeason === s.season_number && styles.seasonTabActive]}
                onPress={() => setActiveSeason(s.season_number)}
              >
                <Text
                  style={[
                    styles.seasonTabText,
                    activeSeason === s.season_number && styles.seasonTabTextActive,
                  ]}
                >
                  עונה {s.season_number}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Episodes */}
        {seasonsLoading ? (
          <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.xl }} />
        ) : (
          (currentSeason?.episodes || []).map((e) => {
            const rec = progress[`${activeSeason}-${e.episode_number}`];
            const watched = rec?.watched;
            const isNext =
              nextEpisode &&
              nextEpisode.season === activeSeason &&
              nextEpisode.episode === e.episode_number;
            return (
              <View key={e.episode_number} style={[styles.episode, isNext && styles.episodeNext]}>
                <View style={styles.episodeStillWrap}>
                  <Image source={{ uri: e.still_url || STILL }} style={styles.episodeStill} />
                  {rec?.progress > 0 && !watched && (
                    <View style={styles.epProgressTrack}>
                      <View style={[styles.epProgressFill, { width: `${rec.progress * 100}%` }]} />
                    </View>
                  )}
                  {watched && (
                    <View style={styles.watchedBadge}>
                      <Ionicons name="checkmark" size={14} color="#fff" />
                    </View>
                  )}
                </View>
                <View style={styles.episodeInfo}>
                  <Text style={styles.episodeTitle} numberOfLines={1}>
                    {e.episode_number}. {e.name}
                  </Text>
                  <Text style={styles.episodeOverview} numberOfLines={2}>
                    {e.overview || "אין תקציר"}
                  </Text>
                  {!watched && (
                    <TouchableOpacity
                      style={styles.watchNow}
                      onPress={() => playEpisode(activeSeason, e.episode_number, e.name)}
                    >
                      <Ionicons name="play" size={14} color={colors.accent} />
                      <Text style={styles.watchNowText}>צפה עכשיו</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          })
        )}
      </View>

      {series.similar?.length > 0 && (
        <View style={{ marginTop: spacing.lg }}>
          <ContentRow title="סדרות דומות" items={series.similar} navigation={navigation} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  backdropWrap: { width, height: width * 0.62 },
  backdrop: { width: "100%", height: "100%", backgroundColor: colors.surface },
  back: {
    position: "absolute",
    top: spacing.xxl,
    insetInlineEnd: spacing.lg,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 999,
    padding: 6,
  },
  body: { paddingHorizontal: spacing.lg, marginTop: -spacing.xl },
  title: { color: colors.text, fontSize: font.title, fontWeight: "800", textAlign: "right" },
  metaRow: { flexDirection: "row-reverse", gap: spacing.md, marginVertical: spacing.sm, alignItems: "center" },
  meta: { color: colors.textMuted, fontSize: font.body, fontWeight: "600" },
  rating: { color: colors.star, fontSize: font.body, fontWeight: "700" },
  pills: { flexDirection: "row-reverse", flexWrap: "wrap", marginVertical: spacing.sm },
  nextButton: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.accent,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  nextText: { color: "#fff", fontSize: font.body, fontWeight: "800" },
  overview: { color: colors.textMuted, fontSize: font.body, lineHeight: 22, marginTop: spacing.md, textAlign: "right" },
  seasonTabs: { marginTop: spacing.xl },
  seasonTab: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  seasonTabActive: { backgroundColor: colors.accent },
  seasonTabText: { color: colors.textMuted, fontSize: font.small, fontWeight: "600" },
  seasonTabTextActive: { color: colors.text },
  episode: {
    flexDirection: "row-reverse",
    marginTop: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  episodeNext: { borderWidth: 1.5, borderColor: colors.accent },
  episodeStillWrap: { width: 130, height: 90 },
  episodeStill: { width: "100%", height: "100%", backgroundColor: colors.surfaceAlt },
  epProgressTrack: { position: "absolute", bottom: 0, insetInlineStart: 0, insetInlineEnd: 0, height: 4, backgroundColor: colors.progressTrack },
  epProgressFill: { height: "100%", backgroundColor: colors.accent },
  watchedBadge: {
    position: "absolute",
    top: 4,
    insetInlineStart: 4,
    backgroundColor: colors.accent,
    borderRadius: 999,
    padding: 2,
  },
  episodeInfo: { flex: 1, padding: spacing.md },
  episodeTitle: { color: colors.text, fontSize: font.body, fontWeight: "700", textAlign: "right" },
  episodeOverview: { color: colors.textFaint, fontSize: font.small, marginTop: 4, textAlign: "right" },
  watchNow: { flexDirection: "row-reverse", alignItems: "center", gap: 4, marginTop: spacing.sm },
  watchNowText: { color: colors.accent, fontSize: font.small, fontWeight: "700" },
});
