import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link } from "expo-router";

import {
  CONDITION_LABELS,
  CONDITIONS,
  typesenseSearch,
  type Condition,
  type ListingDocument,
} from "../lib/typesense";

type SortOption = "newest" | "price_asc" | "price_desc" | "relevance";

const SORT_BY: Record<SortOption, string> = {
  newest: "createdAt:desc",
  price_asc: "price:asc",
  price_desc: "price:desc",
  relevance: "_text_match:desc",
};

const SORT_LABELS: Record<SortOption, string> = {
  newest: "Plus récents",
  price_asc: "Prix ↑",
  price_desc: "Prix ↓",
  relevance: "Pertinence",
};

export default function SearchScreen() {
  const [query, setQuery] = useState("");
  const [condition, setCondition] = useState<Condition | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [results, setResults] = useState<ListingDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setLoading(true);
    if (timer.current) clearTimeout(timer.current);

    timer.current = setTimeout(async () => {
      try {
        const filters = ["status:=active"];
        if (condition) filters.push(`condition:=${condition}`);

        const res = await typesenseSearch
          .collections<ListingDocument>("listings")
          .documents()
          .search({
            q: query || "*",
            query_by: "title,description",
            filter_by: filters.join(" && "),
            sort_by: SORT_BY[sortBy],
            per_page: 24,
          });

        setResults((res.hits ?? []).map((h) => h.document));
        setTotal(res.found);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [query, condition, sortBy]);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchInput}
        value={query}
        onChangeText={setQuery}
        placeholder="Rechercher un manga..."
        placeholderTextColor="#64748b"
        clearButtonMode="while-editing"
      />

      {/* Filtres état */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersRow}
        contentContainerStyle={styles.filtersContent}
      >
        {CONDITIONS.map((c) => (
          <Pressable
            key={c}
            onPress={() => setCondition(condition === c ? null : c)}
            style={[
              styles.chip,
              condition === c && styles.chipActive,
            ]}
          >
            <Text
              style={[
                styles.chipText,
                condition === c && styles.chipTextActive,
              ]}
            >
              {CONDITION_LABELS[c]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Tri */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersRow}
        contentContainerStyle={styles.filtersContent}
      >
        {(Object.keys(SORT_BY) as SortOption[]).map((s) => (
          <Pressable
            key={s}
            onPress={() => setSortBy(s)}
            style={[styles.chip, sortBy === s && styles.chipActive]}
          >
            <Text
              style={[
                styles.chipText,
                sortBy === s && styles.chipTextActive,
              ]}
            >
              {SORT_LABELS[s]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator
          color="#06b6d4"
          style={{ marginTop: 40 }}
        />
      ) : (
        <>
          <Text style={styles.count}>{total} résultat{total !== 1 ? "s" : ""}</Text>
          <FlatList
            data={results}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <Link href={`/listing/${item.id}`} asChild>
                <Pressable style={styles.card}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={styles.cardDesc} numberOfLines={2}>
                    {item.description}
                  </Text>
                  <View style={styles.cardFooter}>
                    <Text style={styles.cardPrice}>
                      {(item.price / 100).toFixed(2)} €
                    </Text>
                    <Text style={styles.cardCondition}>
                      {CONDITION_LABELS[item.condition as Condition] ?? item.condition}
                    </Text>
                  </View>
                </Pressable>
              </Link>
            )}
            ListEmptyComponent={
              <Text style={styles.empty}>Aucun résultat.</Text>
            }
            contentContainerStyle={{ paddingBottom: 24 }}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  searchInput: {
    backgroundColor: "#1e293b",
    borderColor: "#334155",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "#fff",
    fontSize: 16,
    marginBottom: 12,
  },
  filtersRow: { flexGrow: 0, marginBottom: 8 },
  filtersContent: { gap: 8, paddingRight: 16 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#1e293b",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#334155",
  },
  chipActive: { backgroundColor: "#06b6d4", borderColor: "#06b6d4" },
  chipText: { color: "#94a3b8", fontSize: 13 },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  count: { color: "#64748b", fontSize: 13, marginBottom: 10 },
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#334155",
  },
  cardTitle: { color: "#fff", fontWeight: "700", fontSize: 15, marginBottom: 4 },
  cardDesc: { color: "#94a3b8", fontSize: 13, marginBottom: 8 },
  cardFooter: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardPrice: { color: "#06b6d4", fontWeight: "700", fontSize: 15 },
  cardCondition: {
    color: "#64748b",
    fontSize: 12,
    backgroundColor: "#0f172a",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  empty: { color: "#64748b", textAlign: "center", marginTop: 40 },
});
