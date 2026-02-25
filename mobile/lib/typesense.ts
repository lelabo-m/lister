import Typesense from "typesense";

export const typesenseSearch = new Typesense.Client({
  nodes: [
    {
      host: process.env["EXPO_PUBLIC_TYPESENSE_HOST"] ?? "localhost",
      port: Number(process.env["EXPO_PUBLIC_TYPESENSE_PORT"] ?? 8108),
      protocol: process.env["EXPO_PUBLIC_TYPESENSE_PROTOCOL"] ?? "http",
    },
  ],
  apiKey: process.env["EXPO_PUBLIC_TYPESENSE_SEARCH_API_KEY"] ?? "",
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

export const CONDITIONS = ["new", "like_new", "good", "fair"] as const;
export type Condition = (typeof CONDITIONS)[number];

export const CONDITION_LABELS: Record<Condition, string> = {
  new: "Neuf",
  like_new: "Comme neuf",
  good: "Bon état",
  fair: "Correct",
};
