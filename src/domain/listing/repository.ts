import { Context, Effect, Layer } from "effect";
import { eq } from "drizzle-orm";
import {
  DatabaseError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "./errors";
import { db } from "@/db/client";
import { listing } from "@/db/schema";

// --- Types ---

export type Listing = typeof listing.$inferSelect;

export type CreateListingInput = {
  title: string;
  description: string;
  price: number; // en centimes
  condition: "new" | "like_new" | "good" | "fair";
  categoryId?: string;
  userId: string;
};

export type UpdateListingInput = {
  title?: string;
  description?: string;
  price?: number;
  condition?: "new" | "like_new" | "good" | "fair";
  status?: "active" | "sold" | "archived";
  categoryId?: string;
};

// --- Interface du service ---

export class ListingRepository extends Context.Tag("ListingRepository")<
  ListingRepository,
  {
    getById: (
      id: string,
    ) => Effect.Effect<Listing, NotFoundError | DatabaseError>;

    create: (
      input: CreateListingInput,
    ) => Effect.Effect<Listing, ValidationError | DatabaseError>;

    update: (
      id: string,
      input: UpdateListingInput,
      requestingUserId: string,
    ) => Effect.Effect<
      Listing,
      NotFoundError | UnauthorizedError | DatabaseError
    >;

    delete: (
      id: string,
      requestingUserId: string,
    ) => Effect.Effect<void, NotFoundError | UnauthorizedError | DatabaseError>;

    listByUser: (userId: string) => Effect.Effect<Listing[], DatabaseError>;
  }
>() {}

// --- Layer Drizzle (production) ---

export const ListingRepositoryDrizzle = Layer.succeed(ListingRepository, {
  getById: (id) =>
    Effect.tryPromise({
      try: () =>
        db
          .select()
          .from(listing)
          .where(eq(listing.id, id))
          .then((rows) => rows[0]),
      catch: (cause) => new DatabaseError({ cause }),
    }).pipe(
      Effect.flatMap((row) =>
        row ? Effect.succeed(row) : Effect.fail(new NotFoundError({ id })),
      ),
    ),

  create: (input) => {
    if (input.price < 0) {
      return Effect.fail(
        new ValidationError({
          field: "price",
          message: "Le prix ne peut pas être négatif",
        }),
      );
    }
    const id = crypto.randomUUID();
    return Effect.tryPromise({
      try: () =>
        db
          .insert(listing)
          .values({ ...input, id })
          .returning()
          .then((rows) => rows[0]!),
      catch: (cause) => new DatabaseError({ cause }),
    });
  },

  update: (id, input, requestingUserId) =>
    Effect.tryPromise({
      try: () =>
        db
          .select()
          .from(listing)
          .where(eq(listing.id, id))
          .then((rows) => rows[0]),
      catch: (cause) => new DatabaseError({ cause }),
    }).pipe(
      Effect.flatMap((row) =>
        row ? Effect.succeed(row) : Effect.fail(new NotFoundError({ id })),
      ),
      Effect.flatMap((row) =>
        row.userId !== requestingUserId
          ? Effect.fail(
              new UnauthorizedError({ reason: "Tu n'es pas le vendeur" }),
            )
          : Effect.succeed(row),
      ),
      Effect.flatMap(() =>
        Effect.tryPromise({
          try: () =>
            db
              .update(listing)
              .set({ ...input, updatedAt: new Date() })
              .where(eq(listing.id, id))
              .returning()
              .then((rows) => rows[0]!),
          catch: (cause) => new DatabaseError({ cause }),
        }),
      ),
    ),

  delete: (id, requestingUserId) =>
    Effect.tryPromise({
      try: () =>
        db
          .select()
          .from(listing)
          .where(eq(listing.id, id))
          .then((rows) => rows[0]),
      catch: (cause) => new DatabaseError({ cause }),
    }).pipe(
      Effect.flatMap((row) =>
        row ? Effect.succeed(row) : Effect.fail(new NotFoundError({ id })),
      ),
      Effect.flatMap((row) =>
        row.userId !== requestingUserId
          ? Effect.fail(
              new UnauthorizedError({ reason: "Tu n'es pas le vendeur" }),
            )
          : Effect.succeed(row),
      ),
      Effect.flatMap(() =>
        Effect.tryPromise({
          try: () => db.delete(listing).where(eq(listing.id, id)).execute(),
          catch: (cause) => new DatabaseError({ cause }),
        }),
      ),
      Effect.map(() => undefined),
    ),

  listByUser: (userId) =>
    Effect.tryPromise({
      try: () => db.select().from(listing).where(eq(listing.userId, userId)),
      catch: (cause) => new DatabaseError({ cause }),
    }),
});

// --- Layer Mock (tests) ---

export const ListingRepositoryMock = Layer.succeed(ListingRepository, {
  getById: (id) =>
    Effect.succeed({
      id,
      title: "One Piece Vol. 1",
      description: "Très bon état",
      price: 500,
      condition: "like_new" as const,
      status: "active" as const,
      userId: "mock-user-id",
      categoryId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  create: (input) =>
    Effect.succeed({
      id: "mock-listing-id",
      status: "active" as const,
      categoryId: input.categoryId ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...input,
    }),
  update: (id, input) =>
    Effect.succeed({
      id,
      title: input.title ?? "Mock",
      description: input.description ?? "Mock",
      price: input.price ?? 0,
      condition: input.condition ?? ("good" as const),
      status: input.status ?? ("active" as const),
      userId: "mock-user-id",
      categoryId: input.categoryId ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  delete: (_id, _userId) => Effect.succeed(undefined),
  listByUser: (_userId) => Effect.succeed([]),
});
