import React, { useCallback, useState } from "react";
import { View, Text, FlatList, StyleSheet, Alert } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { colors, spacing, font, POSTER_WIDTH } from "../theme";
import { api } from "../api";
import PosterCard from "../components/PosterCard";
import { Loading, EmptyState } from "../components/common";
import { openDetail } from "../navigation/openDetail";

const NUM_COLS = 3;

export default function FavoritesScreen({ navigation }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await api.favorites();
      setItems(data.favorites || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const confirmRemove = (item) => {
    Alert.alert("הסרה ממועדפים", `להסיר את "${item.title}"?`, [
      { text: "ביטול", style: "cancel" },
      {
        text: "הסר",
        style: "destructive",
        onPress: async () => {
          await api.removeFavorite(item.media_type, item.tmdb_id).catch(() => {});
          setItems((prev) => prev.filter((i) => !(i.media_type === item.media_type && i.tmdb_id === item.tmdb_id)));
        },
      },
    ]);
  };

  if (loading) return <Loading />;

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.header}>המועדפים שלי</Text>
        <EmptyState
          icon="heart-outline"
          title="אין עדיין מועדפים"
          subtitle="הוסיפו סרטים וסדרות כדי לראות אותם כאן"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>המועדפים שלי</Text>
      <FlatList
        data={items}
        numColumns={NUM_COLS}
        keyExtractor={(it, i) => `${it.media_type}-${it.tmdb_id}-${i}`}
        columnWrapperStyle={styles.column}
        contentContainerStyle={{ padding: spacing.lg }}
        renderItem={({ item }) => (
          <PosterCard
            item={item}
            showTitle
            width={POSTER_WIDTH}
            onPress={() => openDetail(navigation, item)}
            onLongPress={() => confirmRemove(item)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    color: colors.text,
    fontSize: font.title,
    fontWeight: "800",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.sm,
    textAlign: "right",
  },
  column: { justifyContent: "space-between" },
});
