import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "./auth";

// Session optionnelle — pour les routes publiques
export const getSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequestHeaders();
    return await auth.api.getSession({ headers });
  },
);

// Session obligatoire — throw si non authentifié
export const ensureSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequestHeaders();
    const session = await auth.api.getSession({ headers });
    if (!session) throw new Error("Unauthorized");
    return session;
  },
);
