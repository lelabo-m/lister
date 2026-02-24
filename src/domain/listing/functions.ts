import { auth } from "@/lib/auth";
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { Effect } from "effect";
import {
  ListingRepository,
  ListingRepositoryDrizzle,
  type CreateListingInput,
  type UpdateListingInput,
} from "./repository";

// Helper : récupère la session ou throw 401
function requireSession() {
  return Effect.tryPromise({
    try: () => auth.api.getSession({ headers: getRequestHeaders() }),
    catch: () => new Error("Session fetch failed"),
  }).pipe(
    Effect.flatMap((session) =>
      session
        ? Effect.succeed(session)
        : Effect.fail(new Error("Unauthorized")),
    ),
  );
}

// Helper : run un Effect avec le Layer Drizzle et throw si erreur
function run<A>(effect: Effect.Effect<A, Error>) {
  return Effect.runPromise(effect);
}

// --- getListing ---

export const getListing = createServerFn({ method: "GET" })
  .inputValidator((id: string) => id)
  .handler(async ({ data: id }) => {
    const effect = ListingRepository.pipe(
      Effect.flatMap((repo) => repo.getById(id)),
      Effect.provide(ListingRepositoryDrizzle),
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
      const listing = yield* repo.getById(id);
      const userListings = yield* repo.listByUser(listing.userId);
      return { listing, userListings };
    }).pipe(
      Effect.provide(ListingRepositoryDrizzle),
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

// --- createListing ---

export const createListing = createServerFn({ method: "POST" })
  .inputValidator((data: Omit<CreateListingInput, "userId">) => data)
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
      Effect.provide(ListingRepositoryDrizzle),
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
    );
    return run(effect);
  });

// --- updateListing ---

export const updateListing = createServerFn({ method: "POST" })
  .inputValidator((data: { id: string; input: UpdateListingInput }) => data)
  .handler(async ({ data: { id, input } }) => {
    const effect = requireSession().pipe(
      Effect.flatMap((session) =>
        ListingRepository.pipe(
          Effect.flatMap((repo) => repo.update(id, input, session.user.id)),
        ),
      ),
      Effect.provide(ListingRepositoryDrizzle),
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
      Effect.provide(ListingRepositoryDrizzle),
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

// --- listMyListings ---

export const listMyListings = createServerFn({ method: "GET" }).handler(
  async () => {
    const effect = requireSession().pipe(
      Effect.flatMap((session) =>
        ListingRepository.pipe(
          Effect.flatMap((repo) => repo.listByUser(session.user.id)),
        ),
      ),
      Effect.provide(ListingRepositoryDrizzle),
      Effect.catchTag("DatabaseError", ({ cause }) =>
        Effect.fail(
          Object.assign(new Error("Database error"), { cause, status: 500 }),
        ),
      ),
    );
    return run(effect);
  },
);
