import { createFileRoute } from "@tanstack/react-router";
import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { listing } from "@/db/schema";

export const Route = createFileRoute("/api/listings/$id")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const row = await db
          .select()
          .from(listing)
          .where(eq(listing.id, params.id))
          .then((rows) => rows[0]);

        if (!row) return Response.json({ error: "Not found" }, { status: 404 });
        return Response.json(row);
      },
    },
  },
});
