import React, { useEffect, useState } from "react";
import { TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, spacing, font, radius } from "../theme";
import { api } from "../api";

// Toggles favorite status for a movie/series. `item` must carry the fields
// the backend stores (media_type, tmdb_id, title, poster_path, ...).
export default function FavoriteButton({ item }) {
  const [fav, setFav] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .favoriteStatus(item.media_type, item.tmdb_id)
      .then((r) => active && setFav(r.is_favorite))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [item.media_type, item.tmdb_id]);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const next = !fav;
    setFav(next);
    try {
      if (next) {
        await api.addFavorite({
          media_type: item.media_type,
          tmdb_id: item.tmdb_id,
          title: item.title,
          poster_path: item.poster_path,
          backdrop_path: item.backdrop_path,
          year: item.year,
          rating: item.rating,
        });
      } else {
        await api.removeFavorite(item.media_type, item.tmdb_id);
      }
    } catch {
      setFav(!next); // revert on failure
    } finally {
      setBusy(false);
    }
  }

  return (
    <TouchableOpacity style={styles.button} onPress={toggle} activeOpacity={0.8}>
      <Ionicons
        name={fav ? "heart" : "heart-outline"}
        size={20}
        color={fav ? colors.accent : colors.text}
      />
      <Text style={styles.text}>{fav ? "במועדפים" : "הוסף למועדפים"}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row-reverse",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceAlt,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  text: { color: colors.text, fontSize: font.body, fontWeight: "700" },
});
