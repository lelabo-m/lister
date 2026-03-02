import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";

import type { Condition } from "@/lib/typesense";
import { CONDITION_LABELS } from "@/lib/typesense";

type Listing = {
  id: string;
  title: string;
  description: string;
  price: number;
  condition: string;
  status: string;
};

const API_URL = process.env["EXPO_PUBLIC_API_URL"] ?? "http://localhost:3000";

export default function ListingScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${API_URL}/api/listings/${id}`)
      .then((res) => {
        if (!res.ok) throw new Error(`${res.status}`);
        return res.json() as Promise<Listing>;
      })
      .then(setListing)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Erreur inconnue"),
      )
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#06b6d4" />
      </View>
    );
  }

  if (error || !listing) {
    return (
      <View style={styles.centered}>
        <Text style={styles.error}>
          {error === "404" ? "Annonce introuvable." : "Erreur de chargement."}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ padding: 16 }}
    >
      <View style={styles.card}>
        <View style={styles.header}>
          <Text style={styles.title}>{listing.title}</Text>
          <Text style={styles.price}>{(listing.price / 100).toFixed(2)} €</Text>
        </View>

        <View style={styles.badges}>
          <Text style={styles.badge}>
            {CONDITION_LABELS[listing.condition as Condition] ??
              listing.condition}
          </Text>
          <Text
            style={[
              styles.badge,
              listing.status === "active"
                ? styles.badgeActive
                : styles.badgeInactive,
            ]}
          >
            {listing.status}
          </Text>
        </View>

        <Text style={styles.description}>{listing.description}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  error: { color: "#f87171", fontSize: 15 },
  card: {
    backgroundColor: "#1e293b",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#334155",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
  },
  title: { color: "#fff", fontWeight: "800", fontSize: 20, flex: 1 },
  price: { color: "#06b6d4", fontWeight: "800", fontSize: 20 },
  badges: { flexDirection: "row", gap: 8, marginBottom: 14 },
  badge: {
    color: "#94a3b8",
    fontSize: 12,
    backgroundColor: "#0f172a",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeActive: { color: "#4ade80", backgroundColor: "#052e16" },
  badgeInactive: { color: "#64748b" },
  description: { color: "#cbd5e1", fontSize: 15, lineHeight: 22 },
});
