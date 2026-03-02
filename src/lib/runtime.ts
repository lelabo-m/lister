import { Layer, ManagedRuntime } from "effect";
import { ListingRepositoryLive } from "@/domain/listing/repository";
import { TypesenseLive } from "@/lib/typesense";

const AppLive = Layer.merge(ListingRepositoryLive, TypesenseLive);

export type AppContext = Layer.Layer.Success<typeof AppLive>;

export const runtime = ManagedRuntime.make(AppLive);
