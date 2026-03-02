import { createAuthClient } from "better-auth/react";
import { magicLinkClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL:
    typeof window !== "undefined"
      ? window.location.origin
      : (import.meta.env["VITE_APP_URL"] ?? "http://localhost:3000"),
  plugins: [magicLinkClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
