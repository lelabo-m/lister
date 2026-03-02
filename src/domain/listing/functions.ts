import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { Effect } from "effect";

import { ListingRepository } from "./repository";
import { SessionError } from "./errors";
import { indexListing, removeListing } from "./search";
import type { SqlError } from "@effect/sql/SqlError";

import type { ListingInsert, ListingUpdate } from "@/db/schema";
import { auth } from "@/lib/auth";
import { runtime, type AppContext } from "@/lib/runtime";

type HttpError = Error & { status: number };

const isNonNull = <T>(value: T | null | undefined): value is NonNullable<T> =>
  value != null;

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

function run<T>(effect: Effect.Effect<T, HttpError | SqlError, AppContext>) {
  return runtime.runPromise(
    effect.pipe(
      Effect.catchTag("SqlError", ({ cause }) =>
        Effect.fail(
          Object.assign(new Error("Database connection error"), {
            cause,
            status: 500,
          }) as HttpError,
        ),
      ),
    ),
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

// --- getListingWithUserStats ---

export const getListingWithUserStats = createServerFn({ method: "GET" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const effect = Effect.gen(function* () {
      const repo = yield* ListingRepository;
      const listing = yield* repo.findById(id);
      const userListings = yield* repo.listByUser(listing.userId);
      return { listing, userListings };
    }).pipe(
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
    const effect = requireSession().pipe(
      Effect.flatMap((session) =>
        ListingRepository.pipe(
          Effect.flatMap((repo) =>
            repo.create({ ...data, userId: session.user.id }),
          ),
        ),
      ),
      Effect.tap((listing) => indexListing(listing)),
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
      Effect.catchTag("DatabaseError", ({ cause }) =>
        Effect.fail(
          Object.assign(new Error("Database error"), { cause, status: 500 }),
        ),
      ),
    );
    return run(effect);
  },
);
