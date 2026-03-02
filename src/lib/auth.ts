import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { db } from "@/db/client";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  baseURL: process.env["BETTER_AUTH_URL"]!,
  secret: process.env["BETTER_AUTH_SECRET"]!,
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        // Dev : le lien s'affiche dans les logs du serveur.
        // Prod : remplacer par Resend / SendGrid.
        console.log(`\n[Magic Link] ${email}\n→ ${url}\n`);
      },
    }),
    tanstackStartCookies(), // doit rester en dernier
  ],
});

export type Session = typeof auth.$Infer.Session;
