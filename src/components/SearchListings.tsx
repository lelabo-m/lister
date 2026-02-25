import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";

import type {
  Condition,
  ListingDocument,
  SortOption,
} from "@/lib/typesense-search";

import {
  CONDITIONS,
  CONDITION_LABELS,
  SORT_BY,
  typesenseSearch,
} from "@/lib/typesense-search";
import { posthog } from "@/lib/posthog";

export function SearchListings() {
  const [query, setQuery] = useState("");
  const [condition, setCondition] = useState<Condition | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [results, setResults] = useState<ListingDocument[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);

    const timer = setTimeout(async () => {
      try {
        const filters: string[] = ["status:=active"];
        if (condition) filters.push(`condition:=${condition}`);
        if (minPrice || maxPrice) {
          const min = minPrice ? Number(minPrice) * 100 : 0;
          const max = maxPrice ? Number(maxPrice) * 100 : 999_999_999;
          filters.push(`price:[${min}..${max}]`);
        }

        const res = await typesenseSearch
          .collections<ListingDocument>("listings")
          .documents()
          .search({
            q: query || "*",
            query_by: "title,description",
            filter_by: filters.join(" && "),
            sort_by: SORT_BY[sortBy],
            per_page: 24,
          });

        setResults((res.hits ?? []).map((h) => h.document));
        setTotal(res.found);
        if (query) {
          posthog.capture("search_performed", {
            query,
            condition,
            sortBy,
            resultsCount: res.found,
          });
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, condition, sortBy, minPrice, maxPrice]);

  return (
    <div className="space-y-6">
      {/* Barre de recherche */}
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher un manga..."
        className="w-full px-4 py-3 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-400 focus:outline-none focus:border-cyan-500"
      />

      {/* Filtres + tri */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {/* Filtre état */}
          {CONDITIONS.map((c) => (
            <button
              key={c}
              onClick={() => setCondition(condition === c ? null : c)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                condition === c
                  ? "bg-cyan-500 text-white"
                  : "bg-slate-700 text-slate-300 hover:bg-slate-600"
              }`}
            >
              {CONDITION_LABELS[c]}
            </button>
          ))}

          {/* Fourchette de prix */}
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="Min €"
              className="w-20 px-2 py-1 rounded bg-slate-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
            <span className="text-slate-500">–</span>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="Max €"
              className="w-20 px-2 py-1 rounded bg-slate-700 text-white text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
            />
          </div>
        </div>

        {/* Tri */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortOption)}
          className="px-3 py-1 rounded bg-slate-700 text-slate-300 text-sm focus:outline-none focus:ring-1 focus:ring-cyan-500"
        >
          <option value="newest">Plus récents</option>
          <option value="relevance">Pertinence</option>
          <option value="price_asc">Prix croissant</option>
          <option value="price_desc">Prix décroissant</option>
        </select>
      </div>

      {/* Résultats */}
      <div>
        {!loading && (
          <p className="text-slate-400 text-sm mb-4">
            {total} résultat{total !== 1 ? "s" : ""}
          </p>
        )}

        {loading ? (
          <p className="text-slate-500 text-center py-12">Recherche...</p>
        ) : results.length === 0 ? (
          <p className="text-slate-500 text-center py-12">Aucun résultat.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {results.map((listing) => (
              <Link
                key={listing.id}
                to="/listings/$id"
                params={{ id: listing.id }}
                className="block bg-slate-800 rounded-lg p-4 hover:bg-slate-700 transition-colors"
              >
                <h3 className="font-semibold text-white truncate">
                  {listing.title}
                </h3>
                <p className="text-slate-400 text-sm mt-1 line-clamp-2">
                  {listing.description}
                </p>
                <div className="flex items-center justify-between mt-3">
                  <span className="text-cyan-400 font-bold">
                    {(listing.price / 100).toFixed(2)} €
                  </span>
                  <span className="text-xs text-slate-500 bg-slate-700 px-2 py-1 rounded-full">
                    {CONDITION_LABELS[listing.condition as Condition] ??
                      listing.condition}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
