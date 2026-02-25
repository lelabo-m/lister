import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { router } from "expo-router";

import { authClient } from "../lib/auth-client";

type Listing = {
  id: string;
  title: string;
  price: number;
  condition: string;
  status: string;
};

const API_URL = process.env["EXPO_PUBLIC_API_URL"] ?? "http://localhost:3000";

export default function DashboardScreen() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ email: string } | null>(null);

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    try {
      const session = await authClient.getSession();
      if (!session.data) {
        router.replace("/login");
        return;
      }
      setUser({ email: session.data.user.email });

      const res = await fetch(`${API_URL}/api/listings/mine`, {
        credentials: "include",
      });
      if (res.ok) {
        setListings((await res.json()) as Listing[]);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleSignOut() {
    await authClient.signOut();
    router.replace("/login");
  }

  const active = listings.filter((l) => l.status === "active");
  const sold = listings.filter((l) => l.status === "sold");

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#06b6d4" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.email} numberOfLines={1}>{user?.email}</Text>
        <Pressable onPress={handleSignOut} style={styles.signOutBtn}>
          <Text style={styles.signOutText}>Déconnexion</Text>
        </Pressable>
      </View>

      <View style={styles.stats}>
        {[
          { label: "Actives", value: active.length },
          { label: "Vendues", value: sold.length },
          { label: "Total", value: listings.length },
        ].map((s) => (
          <View key={s.label} style={styles.statCard}>
            <Text style={styles.statLabel}>{s.label}</Text>
            <Text style={styles.statValue}>{s.value}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Mes annonces</Text>

      <FlatList
        data={listings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.listingRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.listingTitle} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={styles.listingMeta}>
                {(item.price / 100).toFixed(2)} € ·{" "}
                <Text
                  style={
                    item.status === "active"
                      ? styles.statusActive
                      : styles.statusInactive
                  }
                >
                  {item.status}
                </Text>
              </Text>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>Aucune annonce pour l'instant.</Text>
        }
        contentContainerStyle={{ paddingBottom: 24 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  email: { color: "#94a3b8", fontSize: 14, flex: 1, marginRight: 8 },
  signOutBtn: {
    backgroundColor: "#1e293b",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  signOutText: { color: "#94a3b8", fontSize: 13 },
  stats: { flexDirection: "row", gap: 10, marginBottom: 24 },
  statCard: {
    flex: 1,
    backgroundColor: "#1e293b",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#334155",
  },
  statLabel: { color: "#64748b", fontSize: 12, marginBottom: 4 },
  statValue: { color: "#fff", fontSize: 22, fontWeight: "800" },
  sectionTitle: { color: "#fff", fontWeight: "700", fontSize: 17, marginBottom: 12 },
  listingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#334155",
  },
  listingTitle: { color: "#fff", fontWeight: "600", fontSize: 14, marginBottom: 3 },
  listingMeta: { color: "#64748b", fontSize: 12 },
  statusActive: { color: "#4ade80" },
  statusInactive: { color: "#64748b" },
  empty: { color: "#64748b", textAlign: "center", marginTop: 24 },
});
