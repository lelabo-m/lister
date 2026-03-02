import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { PgClient } from "@effect/sql-pg";
import * as PgDrizzle from "drizzle-orm/effect-postgres";
import { Config, Context, Effect, Layer, Redacted } from "effect";
import { types } from "pg";
import * as schema from "./schema";

// Validé au démarrage — crash explicite si DATABASE_URL est absent
const databaseUrl = Effect.runSync(Config.redacted("DATABASE_URL"));

// Plain Drizzle — pour better-auth (ne peut pas utiliser l'API Effect)
const sql = neon(Redacted.value(databaseUrl));
export const db = drizzle({ client: sql, schema });

// --- Effect infrastructure ---

// export class DrizzleService extends Context.Tag("DrizzleService")<
//   DrizzleService,
//   PgDrizzle.EffectPgDatabase<typeof schema>
// >() {}

// export const PgClientLive = PgClient.layer({
//   url: Redacted.make(process.env["DATABASE_URL"]!),
//   ssl: true,
// });

// export const DrizzleLive = Layer.effect(
//   DrizzleService,
//   PgDrizzle.makeWithDefaults({ schema }),
// ).pipe(Layer.provide(PgClientLive));

// The date/time type IDs that Drizzle wants to handle itself
const DRIZZLE_DATE_TYPE_IDS = [
  1184, 1114, 1082, 1186, 1231, 1115, 1185, 1187, 1182,
];

// Configure the PgClient layer
export const PgClientLive = PgClient.layer({
  url: databaseUrl,
  ssl: true,
  types: {
    getTypeParser: (typeId, format) => {
      if (DRIZZLE_DATE_TYPE_IDS.includes(typeId)) {
        return (val: any) => val;
      }
      return types.getTypeParser(typeId, format);
    },
  },
});
// Create the DB effect with default services
const dbEffect = PgDrizzle.make({ schema }).pipe(
  Effect.provide(PgDrizzle.DefaultServices),
);

// Define a DB service tag for dependency injection
export class DrizzleService extends Context.Tag("DrizzleService")<
  DrizzleService,
  Effect.Effect.Success<typeof dbEffect>
>() {}

// Create a layer that provides the DB service
export const DrizzleLive = Layer.effect(
  DrizzleService,
  Effect.gen(function* () {
    return yield* dbEffect;
  }),
);

export const DatabaseLive = Layer.provideMerge(DrizzleLive, PgClientLive);
