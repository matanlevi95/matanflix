import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { colors, spacing, font, radius } from "../theme";
import { api } from "../api";
import { Loading, Pill } from "../components/common";
import FavoriteButton from "../components/FavoriteButton";
import ContentRow from "../components/ContentRow";

const { width } = Dimensions.get("window");

export default function MovieDetailScreen({ route, navigation }) {
  const { id, preview } = route.params;
  const [movie, setMovie] = useState(preview || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .details("movie", id)
      .then((d) => setMovie({ ...preview, ...d }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading && !movie?.genres) return <Loading />;
  if (!movie) return <Loading />;

  const backdrop = movie.backdrop_url || `https://image.tmdb.org/t/p/w1280${movie.backdrop_path}`;
  const runtime = movie.runtime ? `${movie.runtime} דק׳` : null;

  const play = () =>
    navigation.navigate("Player", {
      media_type: "movie",
      tmdb_id: movie.tmdb_id,
      imdb_id: movie.imdb_id,
      title: movie.title,
      poster_path: movie.poster_path,
      backdrop_path: movie.backdrop_path,
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
        <Text style={styles.title}>{movie.title}</Text>

        <View style={styles.metaRow}>
          {movie.year ? <Text style={styles.meta}>{movie.year}</Text> : null}
          {runtime ? <Text style={styles.meta}>{runtime}</Text> : null}
          {movie.rating > 0 ? <Text style={styles.rating}>★ {Number(movie.rating).toFixed(1)}</Text> : null}
        </View>

        {movie.genres?.length > 0 && (
          <View style={styles.pills}>
            {movie.genres.map((g) => (
              <Pill key={g} label={g} />
            ))}
          </View>
        )}

        <TouchableOpacity style={styles.playButton} onPress={play}>
          <Ionicons name="play" size={22} color="#000" />
          <Text style={styles.playText}>צפה עכשיו</Text>
        </TouchableOpacity>

        <View style={{ marginTop: spacing.md }}>
          <FavoriteButton item={{ ...movie, media_type: "movie" }} />
        </View>

        {movie.director ? (
          <Text style={styles.director}>במאי: {movie.director}</Text>
        ) : null}

        {movie.overview ? <Text style={styles.overview}>{movie.overview}</Text> : null}

        {movie.cast?.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>שחקנים</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {movie.cast.map((c, i) => (
                <View key={i} style={styles.castItem}>
                  <Image
                    source={{ uri: c.profile_url || "https://via.placeholder.com/100x100/2A2A2A/7A7A7A?text=?" }}
                    style={styles.castImage}
                  />
                  <Text style={styles.castName} numberOfLines={1}>{c.name}</Text>
                  <Text style={styles.castChar} numberOfLines={1}>{c.character}</Text>
                </View>
              ))}
            </ScrollView>
          </>
        )}
      </View>

      {movie.similar?.length > 0 && (
        <View style={{ marginTop: spacing.lg }}>
          <ContentRow title="סרטים דומים" items={movie.similar} navigation={navigation} />
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
  playButton: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.text,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    marginTop: spacing.md,
  },
  playText: { color: "#000", fontSize: font.subtitle, fontWeight: "800" },
  director: { color: colors.textMuted, fontSize: font.body, marginTop: spacing.lg, textAlign: "right" },
  overview: { color: colors.textMuted, fontSize: font.body, lineHeight: 22, marginTop: spacing.md, textAlign: "right" },
  sectionTitle: {
    color: colors.text,
    fontSize: font.subtitle,
    fontWeight: "700",
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    textAlign: "right",
  },
  castItem: { width: 90, marginStart: spacing.md },
  castImage: { width: 90, height: 90, borderRadius: 45, backgroundColor: colors.surface },
  castName: { color: colors.text, fontSize: font.small, marginTop: spacing.xs, textAlign: "center" },
  castChar: { color: colors.textFaint, fontSize: font.tiny, textAlign: "center" },
});
