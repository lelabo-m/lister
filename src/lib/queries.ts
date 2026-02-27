import { queryOptions } from "@tanstack/react-query";
import type {
  Condition,
  ListingDocument,
  SortOption,
} from "@/lib/typesense-search";
import {
  getListingWithUserStats,
  listMyListings,
} from "@/domain/listing/functions";
import { SORT_BY, typesenseSearch } from "@/lib/typesense-search";

export const myListingsQueryOptions = queryOptions({
  queryKey: ["listings", "mine"],
  queryFn: () => listMyListings(),
});

export const listingQueryOptions = (id: string) =>
  queryOptions({
    queryKey: ["listings", id],
    queryFn: () => getListingWithUserStats({ data: id }),
  });

export type SearchParams = {
  query: string;
  condition: Condition | null;
  sortBy: SortOption;
  minPrice: string;
  maxPrice: string;
};

export const searchQueryOptions = (params: SearchParams) =>
  queryOptions({
    queryKey: ["search", params],
    queryFn: async () => {
      const filters: string[] = ["status:=active"];
      if (params.condition) filters.push(`condition:=${params.condition}`);
      if (params.minPrice || params.maxPrice) {
        const min = params.minPrice ? Number(params.minPrice) * 100 : 0;
        const max = params.maxPrice
          ? Number(params.maxPrice) * 100
          : 999_999_999;
        filters.push(`price:[${min}..${max}]`);
      }

      const res = await typesenseSearch
        .collections<ListingDocument>("listings")
        .documents()
        .search({
          q: params.query || "*",
          query_by: "title,description",
          filter_by: filters.join(" && "),
          sort_by: SORT_BY[params.sortBy],
          per_page: 24,
        });

      return {
        results: (res.hits ?? []).map((h) => h.document),
        total: res.found,
      };
    },
    staleTime: 10_000,
  });
