import Typesense from "typesense";

export const typesenseSearch = new Typesense.Client({
  nodes: [
    {
      host: import.meta.env["VITE_TYPESENSE_HOST"] ?? "localhost",
      port: Number(import.meta.env["VITE_TYPESENSE_PORT"] ?? 8108),
      protocol: import.meta.env["VITE_TYPESENSE_PROTOCOL"] ?? "http",
    },
  ],
  apiKey: import.meta.env["VITE_TYPESENSE_SEARCH_API_KEY"] ?? "",
  connectionTimeoutSeconds: 5,
});

export type ListingDocument = {
  id: string;
  title: string;
  description: string;
  price: number;
  condition: string;
  status: string;
  userId: string;
  categoryId?: string;
  createdAt: number;
};

export type SortOption = "relevance" | "price_asc" | "price_desc" | "newest";

export const SORT_BY: Record<SortOption, string> = {
  relevance: "_text_match:desc",
  price_asc: "price:asc",
  price_desc: "price:desc",
  newest: "createdAt:desc",
};

export const CONDITIONS = ["new", "like_new", "good", "fair"] as const;
export type Condition = (typeof CONDITIONS)[number];

export const CONDITION_LABELS: Record<Condition, string> = {
  new: "Neuf",
  like_new: "Comme neuf",
  good: "Bon état",
  fair: "Correct",
};
