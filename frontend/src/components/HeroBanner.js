import React, { useEffect, useRef, useState } from "react";
import { View, Text, Image, TouchableOpacity, StyleSheet, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

import { colors, spacing, font, radius } from "../theme";
import { openDetail } from "../navigation/openDetail";

const { width } = Dimensions.get("window");
const HERO_HEIGHT = 460;

// Rotating featured banner.
export default function HeroBanner({ items, navigation }) {
  const [index, setIndex] = useState(0);
  const timer = useRef(null);

  useEffect(() => {
    if (!items || items.length <= 1) return;
    timer.current = setInterval(() => {
      setIndex((i) => (i + 1) % items.length);
    }, 6000);
    return () => clearInterval(timer.current);
  }, [items]);

  if (!items || items.length === 0) return null;
  const item = items[index];
  const backdrop = item.backdrop_url || `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`;

  return (
    <View style={styles.wrap}>
      <Image source={{ uri: backdrop }} style={styles.image} resizeMode="cover" />
      <LinearGradient
        colors={["transparent", "rgba(20,20,20,0.6)", colors.background]}
        style={styles.gradient}
      />
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        <View style={styles.meta}>
          {item.year ? <Text style={styles.metaText}>{item.year}</Text> : null}
          {item.rating > 0 ? (
            <Text style={styles.metaText}>★ {Number(item.rating).toFixed(1)}</Text>
          ) : null}
          <Text style={styles.badge}>{item.media_type === "tv" ? "סדרה" : "סרט"}</Text>
        </View>
        <Text style={styles.overview} numberOfLines={3}>
          {item.overview}
        </Text>
        <TouchableOpacity style={styles.button} onPress={() => openDetail(navigation, item)}>
          <Ionicons name="play" size={20} color="#000" />
          <Text style={styles.buttonText}>צפה עכשיו</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.dots}>
        {items.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width, height: HERO_HEIGHT, marginBottom: spacing.lg },
  image: { width: "100%", height: "100%" },
  gradient: { ...StyleSheet.absoluteFillObject },
  content: {
    position: "absolute",
    bottom: spacing.xl,
    insetInlineStart: spacing.lg,
    insetInlineEnd: spacing.lg,
    alignItems: "center",
  },
  title: {
    color: colors.text,
    fontSize: font.hero,
    fontWeight: "800",
    textAlign: "center",
  },
  meta: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.md,
    marginVertical: spacing.sm,
  },
  metaText: { color: colors.textMuted, fontSize: font.body, fontWeight: "600" },
  badge: {
    color: colors.text,
    fontSize: font.small,
    backgroundColor: colors.accent,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  overview: {
    color: colors.textMuted,
    fontSize: font.small,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  button: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.text,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  buttonText: { color: "#000", fontSize: font.body, fontWeight: "800" },
  dots: {
    position: "absolute",
    top: spacing.lg,
    insetInlineStart: 0,
    insetInlineEnd: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textFaint,
  },
  dotActive: { backgroundColor: colors.accent, width: 16 },
});
