import React from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet } from "react-native";

import { colors, radius, font, POSTER_WIDTH, POSTER_HEIGHT } from "../theme";

const PLACEHOLDER = "https://via.placeholder.com/300x450/2A2A2A/7A7A7A?text=No+Image";

// A poster with optional rating badge, progress bar and title.
export default function PosterCard({ item, onPress, onLongPress, showTitle = false, progress = 0, width = POSTER_WIDTH }) {
  const height = (width * POSTER_HEIGHT) / POSTER_WIDTH;
  const poster = item.poster_url || (item.poster_path ? `https://image.tmdb.org/t/p/w500${item.poster_path}` : PLACEHOLDER);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.wrap, { width }]}
    >
      <View style={[styles.posterWrap, { width, height }]}>
        <Image source={{ uri: poster }} style={styles.poster} resizeMode="cover" />
        {item.rating > 0 && (
          <View style={styles.rating}>
            <Text style={styles.ratingText}>★ {Number(item.rating).toFixed(1)}</Text>
          </View>
        )}
        {progress > 0 && (
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
          </View>
        )}
      </View>
      {showTitle && (
        <Text style={styles.title} numberOfLines={1}>
          {item.title}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { marginEnd: 10 },
  posterWrap: {
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: colors.surface,
  },
  poster: { width: "100%", height: "100%" },
  rating: {
    position: "absolute",
    top: 6,
    insetInlineStart: 6,
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: radius.sm,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  ratingText: { color: colors.star, fontSize: font.tiny, fontWeight: "700" },
  progressTrack: {
    position: "absolute",
    bottom: 0,
    insetInlineStart: 0,
    insetInlineEnd: 0,
    height: 4,
    backgroundColor: colors.progressTrack,
  },
  progressFill: { height: "100%", backgroundColor: colors.accent },
  title: {
    color: colors.textMuted,
    fontSize: font.small,
    marginTop: 4,
    textAlign: "right",
  },
});
