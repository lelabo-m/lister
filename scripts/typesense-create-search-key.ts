/**
 * Crée une clé API read-only pour la recherche côté client.
 * À exécuter une seule fois par environnement.
 * Usage : bun run scripts/typesense-create-search-key.ts
 */

import { typesenseAdmin } from "@/lib/typesense";

const key = await typesenseAdmin.keys().create({
  description: "Search-only key — listings (client-side)",
  actions: ["documents:search"],
  collections: ["listings"],
});

console.log("✅ Clé créée :");
console.log(`VITE_TYPESENSE_SEARCH_API_KEY=${key.value}`);
console.log("\nAjoute cette ligne dans ton .env");
