import React from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";

import { colors, spacing, font } from "../theme";
import PosterCard from "./PosterCard";
import { openDetail } from "../navigation/openDetail";

// A titled horizontal scroller of posters. `getProgress(item)` is optional.
export default function ContentRow({ title, items, navigation, getProgress, showTitle = false }) {
  if (!items || items.length === 0) return null;

  return (
    <View style={styles.row}>
      <Text style={styles.heading}>{title}</Text>
      <FlatList
        horizontal
        data={items}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(it, i) => `${it.media_type}-${it.tmdb_id}-${i}`}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <PosterCard
            item={item}
            showTitle={showTitle}
            progress={getProgress ? getProgress(item) : 0}
            onPress={() => openDetail(navigation, item)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: { marginBottom: spacing.xl },
  heading: {
    color: colors.text,
    fontSize: font.subtitle,
    fontWeight: "700",
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    textAlign: "right",
  },
  list: { paddingHorizontal: spacing.lg },
});
