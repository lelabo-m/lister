/**
 * Re-indexe tous les listings actifs depuis la DB vers Typesense.
 * Usage : bun run scripts/typesense-reindex.ts
 */

import { Effect } from "effect";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { listing } from "@/db/schema";
import { ensureCollection, indexListing } from "@/domain/listing/search";

const reindex = Effect.gen(function* () {
  yield* ensureCollection();

  const listings = yield* Effect.tryPromise({
    try: () => db.select().from(listing).where(eq(listing.status, "active")),
    catch: (cause) => new Error(`DB fetch failed: ${cause}`),
  });

  yield* Effect.forEach(listings, (l) => indexListing(l), { concurrency: 10 });

  return listings.length;
});

Effect.runPromise(reindex)
  .then((count) => {
    console.log(`✅ ${count} listings re-indexed.`);
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ Reindex failed:", err);
    process.exit(1);
  });
