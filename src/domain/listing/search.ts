import { Effect } from "effect";
import { TypeSenseError } from "./errors";
import type { CollectionCreateSchema } from "typesense/lib/Typesense/Collections.js";

import type { Listing } from "./repository";
import { TypesenseService } from "@/lib/typesense";

// --- Schema de la collection ---

const COLLECTION = "listings";

const listingCollectionSchema: CollectionCreateSchema = {
  name: COLLECTION,
  fields: [
    { name: "title", type: "string" },
    { name: "description", type: "string" },
    { name: "price", type: "int32", facet: true, sort: true },
    { name: "condition", type: "string", facet: true },
    { name: "status", type: "string", facet: true },
    { name: "userId", type: "string" },
    { name: "categoryId", type: "string", facet: true, optional: true },
    { name: "createdAt", type: "int64", sort: true },
  ],
  default_sorting_field: "createdAt",
};

// --- Helpers ---

function toDocument(listing: Listing) {
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    price: listing.price,
    condition: listing.condition,
    status: listing.status,
    userId: listing.userId,
    ...(listing.categoryId ? { categoryId: listing.categoryId } : {}),
    createdAt: Math.floor(listing.createdAt.getTime() / 1000),
  };
}

// --- Effets publics ---

export function ensureCollection() {
  return Effect.gen(function* () {
    const client = yield* TypesenseService;
    yield* Effect.tryPromise({
      try: async () => {
        try {
          await client.collections(COLLECTION).retrieve();
        } catch {
          await client.collections().create(listingCollectionSchema);
        }
      },
      catch: (cause) => new TypeSenseError({ operation: "ensureCollection", cause }),
    });
  });
}

export function indexListing(listing: Listing) {
  return Effect.gen(function* () {
    const client = yield* TypesenseService;
    yield* Effect.tryPromise({
      try: () =>
        client.collections(COLLECTION).documents().upsert(toDocument(listing)),
      catch: (cause) => new TypeSenseError({ operation: "index", cause }),
    });
  });
}

export function removeListing(id: string) {
  return Effect.gen(function* () {
    const client = yield* TypesenseService;
    yield* Effect.tryPromise({
      try: () => client.collections(COLLECTION).documents(id).delete(),
      catch: (cause) => new TypeSenseError({ operation: "remove", cause }),
    });
  });
}
