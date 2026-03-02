import Typesense from "typesense";
import { Config, Context, Effect, Layer } from "effect";

type TypesenseClient = InstanceType<typeof Typesense.Client>;

export class TypesenseService extends Context.Tag("TypesenseService")<
  TypesenseService,
  TypesenseClient
>() {}

export const TypesenseLive = Layer.effect(
  TypesenseService,
  Effect.gen(function* () {
    const host = yield* Config.withDefault(Config.string("TYPESENSE_HOST"), "localhost");
    const port = yield* Config.withDefault(Config.number("TYPESENSE_PORT"), 8108);
    const protocol = yield* Config.withDefault(Config.string("TYPESENSE_PROTOCOL"), "http");
    const apiKey = yield* Config.withDefault(Config.string("TYPESENSE_ADMIN_API_KEY"), "local-dev-key");

    return new Typesense.Client({
      nodes: [{ host, port, protocol }],
      apiKey,
      connectionTimeoutSeconds: 5,
    });
  }).pipe(Effect.orDie), // Config.withDefault ne peut pas échouer — ConfigError → défaut
);
