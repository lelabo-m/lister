import Typesense from "typesense";

export const typesenseAdmin = new Typesense.Client({
  nodes: [
    {
      host: process.env["TYPESENSE_HOST"] ?? "localhost",
      port: Number(process.env["TYPESENSE_PORT"] ?? 8108),
      protocol: process.env["TYPESENSE_PROTOCOL"] ?? "http",
    },
  ],
  apiKey: process.env["TYPESENSE_ADMIN_API_KEY"] ?? "local-dev-key",
  connectionTimeoutSeconds: 5,
});
