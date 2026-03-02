/**
 * Crée une clé API read-only pour la recherche côté client.
 * À exécuter une seule fois par environnement.
 * Usage : bun run scripts/typesense-create-search-key.ts
 */

import { Effect } from "effect";
import { TypesenseService, TypesenseLive } from "@/lib/typesense";

const program = Effect.gen(function* () {
  const client = yield* TypesenseService;
  const key = yield* Effect.tryPromise({
    try: () =>
      client.keys().create({
        description: "Search-only key — listings (client-side)",
        actions: ["documents:search"],
        collections: ["listings"],
      }),
    catch: (cause) => new Error(`Failed to create key: ${cause}`),
  });

  console.log("✅ Clé créée :");
  console.log(`VITE_TYPESENSE_SEARCH_API_KEY=${key.value}`);
  console.log("\nAjoute cette ligne dans ton .env");
});

Effect.runPromise(program.pipe(Effect.provide(TypesenseLive))).catch((err) => {
  console.error("❌ Failed:", err);
  process.exit(1);
});
