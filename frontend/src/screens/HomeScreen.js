import React, { useCallback, useState } from "react";
import { ScrollView, RefreshControl, View, Text, StyleSheet } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

import { colors, spacing, font } from "../theme";
import { api } from "../api";
import HeroBanner from "../components/HeroBanner";
import ContentRow from "../components/ContentRow";
import { Loading, EmptyState } from "../components/common";

export default function HomeScreen({ navigation }) {
  const [data, setData] = useState(null);
  const [continueRow, setContinueRow] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(false);
      const [home, cont, favs] = await Promise.all([
        api.home(),
        api.continueWatching().catch(() => ({ continue: [] })),
        api.favorites().catch(() => ({ favorites: [] })),
      ]);
      setData(home);
      setContinueRow(cont.continue || []);
      setFavorites(favs.favorites || []);
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading) return <Loading />;

  if (error && !data) {
    return (
      <EmptyState
        icon="cloud-offline-outline"
        title="לא ניתן להתחבר לשרת"
        subtitle="ודאו שהשרת פועל ונסו שוב"
      />
    );
  }

  const continueItems = continueRow.map((r) => ({
    ...r,
    poster_url: r.poster_path ? `https://image.tmdb.org/t/p/w500${r.poster_path}` : null,
    _progress: r.progress,
  }));

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: spacing.xxl }}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            setRefreshing(true);
            load();
          }}
          tintColor={colors.accent}
        />
      }
    >
      <View style={styles.brandBar}>
        <Text style={styles.brand}>Matanflix</Text>
      </View>

      <HeroBanner items={data?.hero || []} navigation={navigation} />

      {continueItems.length > 0 && (
        <ContentRow
          title="המשך צפייה"
          items={continueItems}
          navigation={navigation}
          getProgress={(it) => it._progress || 0}
        />
      )}

      {favorites.length > 0 && (
        <ContentRow title="המועדפים שלי" items={favorites} navigation={navigation} />
      )}

      {(data?.rows || []).map((row) => (
        <ContentRow key={row.key} title={row.title} items={row.items} navigation={navigation} />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  brandBar: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.sm,
  },
  brand: {
    color: colors.accent,
    fontSize: font.title,
    fontWeight: "900",
    letterSpacing: 1,
    textAlign: "right",
  },
});
