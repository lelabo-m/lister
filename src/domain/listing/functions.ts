import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { Effect } from "effect";

import { ListingRepository, ListingRepositoryLive } from "./repository";
import { SessionError } from "./errors";
import { indexListing, removeListing } from "./search";
import type { SqlError } from "@effect/sql/SqlError";

import type { ListingInsert, ListingUpdate } from "@/db/schema";
import { auth } from "@/lib/auth";

type HttpError = Error & { status: number };

const isNonNull = <T>(value: T | null | undefined): value is NonNullable<T> =>
  value != null;

// Helper : récupère la session ou throw 401
function requireSession() {
  return Effect.tryPromise({
    try: () => auth.api.getSession({ headers: getRequestHeaders() }),
    catch: () => new SessionError({ cause: "Session fetch failed" }),
  }).pipe(
    Effect.filterOrFail(
      isNonNull,
      () => new SessionError({ cause: "No active session" }),
    ),
    Effect.catchTag("SessionError", () =>
      Effect.fail(
        Object.assign(new Error("Unauthorized"), { status: 401 }) as HttpError,
      ),
    ),
  );
}

// Helper : run un Effect, absorbe SqlError (échec d'initialisation de la connexion)
function run<T>(effect: Effect.Effect<T, HttpError | SqlError>) {
  return effect.pipe(
    Effect.catchTag("SqlError", ({ cause }) =>
      Effect.fail(
        Object.assign(new Error("Database connection error"), {
          cause,
          status: 500,
        }) as HttpError,
      ),
    ),
    Effect.runPromise,
  );
}

// --- getListing ---

export const getListing = createServerFn({ method: "GET" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const effect = Effect.gen(function* () {
      const repository = yield* ListingRepository;
      return yield* repository.findById(id);
    }).pipe(
      Effect.provide(ListingRepositoryLive),
      Effect.catchTag("NotFoundError", () =>
        Effect.fail(Object.assign(new Error("Not found"), { status: 404 })),
      ),
      Effect.catchTag("DatabaseError", ({ cause }) =>
        Effect.fail(
          Object.assign(new Error("Database error"), { cause, status: 500 }),
        ),
      ),
    );

    return run(effect);
  });

// --- getListingWithUserStats (générateur : lisible comme de l'async/await) ---

export const getListingWithUserStats = createServerFn({ method: "GET" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const effect = Effect.gen(function* () {
      const repo = yield* ListingRepository;
      const listing = yield* repo.findById(id);
      const userListings = yield* repo.listByUser(listing.userId);
      return { listing, userListings };
    }).pipe(
      Effect.provide(ListingRepositoryLive),
      Effect.catchTag("NotFoundError", () =>
        Effect.fail(
          Object.assign(new Error("Not found"), { status: 404 }) as HttpError,
        ),
      ),
      Effect.catchTag("DatabaseError", ({ cause }) =>
        Effect.fail(
          Object.assign(new Error("Database error"), {
            cause,
            status: 500,
          }) as HttpError,
        ),
      ),
    );
    return run(effect);
  });

// --- createListing ---
export type CreateListingInput = Pick<
  ListingInsert,
  "title" | "description" | "price" | "condition"
>;

export const createListing = createServerFn({ method: "POST" })
  .inputValidator((data: CreateListingInput) => data)
  .handler(async ({ data }) => {
    const sessionEffect = requireSession();

    const effect = sessionEffect.pipe(
      Effect.flatMap((session) =>
        ListingRepository.pipe(
          Effect.flatMap((repo) =>
            repo.create({ ...data, userId: session.user.id }),
          ),
        ),
      ),
      Effect.tap((listing) => indexListing(listing)),
      Effect.provide(ListingRepositoryLive),
      Effect.catchTag("ValidationError", ({ field, message }) =>
        Effect.fail(
          Object.assign(new Error(`${field}: ${message}`), { status: 400 }),
        ),
      ),
      Effect.catchTag("DatabaseError", ({ cause }) =>
        Effect.fail(
          Object.assign(new Error("Database error"), { cause, status: 500 }),
        ),
      ),
      Effect.catchTag("TypeSenseError", ({ operation, cause }) =>
        Effect.fail(
          Object.assign(new Error(`TypeSenseError error on ${operation}`), {
            cause,
            status: 500,
          }),
        ),
      ),
    );
    return run(effect);
  });

// --- updateListing ---

export const updateListing = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; input: ListingUpdate }) => data)
  .handler(async ({ data: { id, input } }) => {
    const effect = requireSession().pipe(
      Effect.flatMap((session) =>
        ListingRepository.pipe(
          Effect.flatMap((repo) => repo.update(id, input, session.user.id)),
        ),
      ),
      Effect.provide(ListingRepositoryLive),
      Effect.catchTag("NotFoundError", () =>
        Effect.fail(Object.assign(new Error("Not found"), { status: 404 })),
      ),
      Effect.catchTag("UnauthorizedError", () =>
        Effect.fail(Object.assign(new Error("Forbidden"), { status: 403 })),
      ),
      Effect.catchTag("DatabaseError", ({ cause }) =>
        Effect.fail(
          Object.assign(new Error("Database error"), { cause, status: 500 }),
        ),
      ),
    );
    return run(effect);
  });

// --- deleteListing ---

export const deleteListing = createServerFn({ method: "POST" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const effect = requireSession().pipe(
      Effect.flatMap((session) =>
        ListingRepository.pipe(
          Effect.flatMap((repo) => repo.delete(id, session.user.id)),
        ),
      ),
      Effect.tap(() => removeListing(id)),
      Effect.provide(ListingRepositoryLive),
      Effect.catchTag("NotFoundError", () =>
        Effect.fail(Object.assign(new Error("Not found"), { status: 404 })),
      ),
      Effect.catchTag("UnauthorizedError", () =>
        Effect.fail(Object.assign(new Error("Forbidden"), { status: 403 })),
      ),
      Effect.catchTag("DatabaseError", ({ cause }) =>
        Effect.fail(
          Object.assign(new Error("Database error"), { cause, status: 500 }),
        ),
      ),
      Effect.catchTag("TypeSenseError", ({ operation, cause }) =>
        Effect.fail(
          Object.assign(new Error(`TypeSenseError error on ${operation}`), {
            cause,
            status: 500,
          }),
        ),
      ),
    );
    return run(effect);
  });

// --- listMyListings ---

export const listMyListings = createServerFn({ method: "GET" }).handler(
  async () => {
    const effect = requireSession().pipe(
      Effect.flatMap((session) =>
        ListingRepository.pipe(
          Effect.flatMap((repo) => repo.listByUser(session.user.id)),
        ),
      ),
      Effect.provide(ListingRepositoryLive),
      Effect.catchTag("DatabaseError", ({ cause }) =>
        Effect.fail(
          Object.assign(new Error("Database error"), { cause, status: 500 }),
        ),
      ),
    );
    return run(effect);
  },
);
