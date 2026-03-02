import { Context, Effect, Layer } from "effect";
import { eq } from "drizzle-orm";
import {
  DatabaseError,
  NotFoundError,
  UnauthorizedError,
  ValidationError,
} from "./errors";
import type { Condition } from "./constants";
import type { ListingInsert, ListingSelect, ListingUpdate } from "@/db/schema";
import { DatabaseLive, DrizzleService } from "@/db/client";
import { listing } from "@/db/schema";

export type { ListingSelect } from "@/db/schema";
export type Listing = ListingSelect;

// --- Interface du service ---

export class ListingRepository extends Context.Tag("ListingRepository")<
  ListingRepository,
  {
    findById: (
      id: string,
    ) => Effect.Effect<ListingSelect, NotFoundError | DatabaseError>;

    create: (
      input: Omit<ListingInsert, "id">,
    ) => Effect.Effect<ListingSelect, ValidationError | DatabaseError>;

    update: (
      id: string,
      input: ListingUpdate,
      requestingUserId: string,
    ) => Effect.Effect<
      ListingSelect,
      NotFoundError | UnauthorizedError | DatabaseError
    >;

    delete: (
      id: string,
      requestingUserId: string,
    ) => Effect.Effect<void, NotFoundError | UnauthorizedError | DatabaseError>;

    listByUser: (
      userId: string,
    ) => Effect.Effect<ListingSelect[], DatabaseError>;
  }
>() {}

// --- Layer Drizzle (production) ---

export const ListingRepositoryLive = Layer.effect(
  ListingRepository,
  Effect.gen(function* () {
    const db = yield* DrizzleService;

    return {
      findById: (id) =>
        Effect.gen(function* () {
          const rows = yield* db
            .select()
            .from(listing)
            .where(eq(listing.id, id))
            .pipe(Effect.mapError((cause) => new DatabaseError({ cause })));
          return yield* Effect.fromNullable(rows[0]).pipe(
            Effect.mapError(() => new NotFoundError({ id })),
          );
        }),
      create: (input) =>
        Effect.gen(function* () {
          if (input.price < 0) {
            yield* Effect.fail(
              new ValidationError({
                field: "price",
                message: "Le prix ne peut pas être négatif",
              }),
            );
          }
          const id = crypto.randomUUID();
          const rows = yield* db
            .insert(listing)
            .values({ ...input, id })
            .returning()
            .pipe(Effect.mapError((cause) => new DatabaseError({ cause })));
          return yield* Effect.fromNullable(rows[0]).pipe(
            Effect.mapError(
              () => new DatabaseError({ cause: "Insert returned no row" }),
            ),
          );
        }),

      update: (id, input, requestingUserId) =>
        Effect.gen(function* () {
          const retrievedRows = yield* db
            .select()
            .from(listing)
            .where(eq(listing.id, id))
            .pipe(Effect.mapError((cause) => new DatabaseError({ cause })));
          const row = yield* Effect.fromNullable(retrievedRows[0]).pipe(
            Effect.mapError(() => new NotFoundError({ id })),
          );
          if (row.userId !== requestingUserId) {
            yield* Effect.fail(
              new UnauthorizedError({ reason: "Tu n'es pas le vendeur" }),
            );
          }
          const resultRows = yield* db
            .update(listing)
            .set({ ...input, updatedAt: new Date() })
            .where(eq(listing.id, id))
            .returning()
            .pipe(Effect.mapError((cause) => new DatabaseError({ cause })));
          return yield* Effect.fromNullable(resultRows[0]).pipe(
            Effect.mapError(
              () => new DatabaseError({ cause: "Insert returned no row" }),
            ),
          );
        }),

      delete: (id, requestingUserId) =>
        Effect.gen(function* () {
          const rows = yield* db
            .select()
            .from(listing)
            .where(eq(listing.id, id))
            .pipe(Effect.mapError((cause) => new DatabaseError({ cause })));
          const row = yield* Effect.fromNullable(rows[0]).pipe(
            Effect.mapError(() => new NotFoundError({ id })),
          );
          if (row.userId !== requestingUserId) {
            yield* Effect.fail(
              new UnauthorizedError({ reason: "Tu n'es pas le vendeur" }),
            );
          }
          return yield* db
            .delete(listing)
            .where(eq(listing.id, id))
            .pipe(Effect.mapError((cause) => new DatabaseError({ cause })));
        }),

      listByUser: (userId) =>
        db
          .select()
          .from(listing)
          .where(eq(listing.userId, userId))
          .pipe(Effect.mapError((cause) => new DatabaseError({ cause }))),
    };
  }),
).pipe(Layer.provide(DatabaseLive));

// --- Layer Mock (tests) ---

export const ListingRepositoryMock = Layer.succeed(ListingRepository, {
  findById: (id) =>
    Effect.succeed({
      id,
      title: "One Piece Vol. 1",
      description: "Très bon état",
      price: 500,
      condition: "like_new" as Condition,
      status: "active" as const,
      userId: "mock-user-id",
      categoryId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  create: (input) =>
    Effect.succeed({
      ...input,
      id: "mock-listing-id",
      status: "active" as const,
      categoryId: input.categoryId ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  update: (id, input) =>
    Effect.succeed({
      id,
      title: input.title ?? "Mock",
      description: input.description ?? "Mock",
      price: input.price ?? 0,
      condition: input.condition ?? ("good" as Condition),
      status: input.status ?? ("active" as const),
      userId: "mock-user-id",
      categoryId: input.categoryId ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  delete: (_id, _userId) => Effect.succeed(undefined),
  listByUser: (_userId) => Effect.succeed([]),
});
