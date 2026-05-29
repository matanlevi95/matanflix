import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { colors, spacing, font, radius } from "../theme";
import { api } from "../api";
import { EmptyState } from "../components/common";
import { openDetail } from "../navigation/openDetail";

const FILTERS = [
  { key: "all", label: "הכל" },
  { key: "movie", label: "סרטים" },
  { key: "tv", label: "סדרות" },
];

const PLACEHOLDER = "https://via.placeholder.com/120x180/2A2A2A/7A7A7A?text=?";

export default function SearchScreen({ navigation }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounce = useRef(null);

  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    if (!query.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    debounce.current = setTimeout(() => runSearch(query, filter), 400);
    return () => clearTimeout(debounce.current);
  }, [query, filter]);

  async function runSearch(q, f) {
    setLoading(true);
    try {
      const data = await api.search(q.trim(), f);
      setResults(data.results || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  }

  const renderItem = ({ item }) => {
    const poster = item.poster_url || PLACEHOLDER;
    return (
      <TouchableOpacity style={styles.result} onPress={() => openDetail(navigation, item)}>
        <Image source={{ uri: poster }} style={styles.poster} />
        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={2}>
            {item.title}
          </Text>
          <View style={styles.metaRow}>
            <View style={styles.typeBadge}>
              <Text style={styles.typeBadgeText}>
                {item.media_type === "tv" ? "סדרה" : "סרט"}
              </Text>
            </View>
            {item.year ? <Text style={styles.meta}>{item.year}</Text> : null}
            {item.rating > 0 ? (
              <Text style={styles.rating}>★ {Number(item.rating).toFixed(1)}</Text>
            ) : null}
          </View>
          <Text style={styles.overview} numberOfLines={3}>
            {item.overview}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={20} color={colors.textMuted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="חפשו סרטים וסדרות..."
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            textAlign="right"
            autoCorrect={false}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")}>
              <Ionicons name="close-circle" size={20} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.filters}>
          {FILTERS.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filter, filter === f.key && styles.filterActive]}
              onPress={() => setFilter(f.key)}
            >
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      ) : results.length > 0 ? (
        <FlatList
          data={results}
          keyExtractor={(it, i) => `${it.media_type}-${it.tmdb_id}-${i}`}
          renderItem={renderItem}
          contentContainerStyle={{ padding: spacing.lg }}
        />
      ) : searched ? (
        <EmptyState icon="search-outline" title="לא נמצאו תוצאות" subtitle="נסו מונח חיפוש אחר" />
      ) : (
        <EmptyState icon="search-outline" title="חיפוש" subtitle="הקלידו שם של סרט או סדרה" />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { paddingTop: spacing.xxl, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  searchBar: {
    flexDirection: "row-reverse",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
  },
  input: { flex: 1, color: colors.text, fontSize: font.body, paddingVertical: spacing.md },
  filters: { flexDirection: "row-reverse", gap: spacing.sm, marginTop: spacing.md },
  filter: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
  },
  filterActive: { backgroundColor: colors.accent },
  filterText: { color: colors.textMuted, fontSize: font.small, fontWeight: "600" },
  filterTextActive: { color: colors.text },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  result: {
    flexDirection: "row-reverse",
    marginBottom: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  poster: { width: 90, height: 135, backgroundColor: colors.surfaceAlt },
  info: { flex: 1, padding: spacing.md },
  title: { color: colors.text, fontSize: font.body, fontWeight: "700", textAlign: "right" },
  metaRow: { flexDirection: "row-reverse", alignItems: "center", gap: spacing.sm, marginVertical: spacing.sm },
  typeBadge: { backgroundColor: colors.accent, borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 1 },
  typeBadgeText: { color: colors.text, fontSize: font.tiny, fontWeight: "700" },
  meta: { color: colors.textMuted, fontSize: font.small },
  rating: { color: colors.star, fontSize: font.small, fontWeight: "700" },
  overview: { color: colors.textFaint, fontSize: font.small, textAlign: "right" },
});
