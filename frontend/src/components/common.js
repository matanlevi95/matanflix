import React from "react";
import { View, Text, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, spacing, font } from "../theme";

export function Loading({ text = "טוען..." }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" color={colors.accent} />
      <Text style={styles.muted}>{text}</Text>
    </View>
  );
}

export function EmptyState({ icon = "tv-outline", title, subtitle }) {
  return (
    <View style={styles.center}>
      <Ionicons name={icon} size={64} color={colors.textFaint} />
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.muted}>{subtitle}</Text> : null}
    </View>
  );
}

export function Pill({ label }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.pillText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  title: {
    color: colors.text,
    fontSize: font.subtitle,
    fontWeight: "700",
    marginTop: spacing.lg,
    textAlign: "center",
  },
  muted: { color: colors.textMuted, fontSize: font.body, marginTop: spacing.sm, textAlign: "center" },
  pill: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    marginStart: spacing.sm,
    marginBottom: spacing.sm,
  },
  pillText: { color: colors.textMuted, fontSize: font.small },
});
