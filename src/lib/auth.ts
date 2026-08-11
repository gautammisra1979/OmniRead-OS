import { betterAuth, APIError } from "better-auth";
import { anonymous } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/neon-http";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { sql } from "~/db";
import * as authSchema from "~/db/auth-schema";
import { mergeAnonymousUserData } from "~/lib/mergeAnonymousUser";

const ANONYMOUS_SESSION_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 30; // 30 days

/**
 * Admin status is fully dynamic (see requireAdmin.ts) — it's computed on
 * every request from these env vars, never persisted to the DB. Whoever is
 * signed in under ADMIN_EMAIL or ADMIN_EMAIL_BACKUP is admin; changing
 * either in Vercel's env vars changes who's admin on the next request, no
 * other action needed. The only way to create or reset the account
 * attached to one of these addresses is the token-gated /admin/claim route
 * (src/routes/admin_.claim.tsx) — see the reserved-email guard in
 * databaseHooks below.
 */
const adminEmail = process.env.ADMIN_EMAIL;
if (!adminEmail) {
  throw new Error(
    "ADMIN_EMAIL is not set. Add the email address that should have " +
      "admin access to .env.local (dev) and the Vercel project's " +
      "environment variables (prod) before starting the app.",
  );
}

const adminEmailBackup = process.env.ADMIN_EMAIL_BACKUP; // optional — lockout recovery path

const adminClaimToken = process.env.ADMIN_CLAIM_TOKEN;
if (!adminClaimToken) {
  throw new Error(
    "ADMIN_CLAIM_TOKEN is not set. Generate a random secret (e.g. " +
      "`openssl rand -hex 32`) and add it to .env.local (dev) and the " +
      "Vercel project's environment variables (prod) — it gates the " +
      "/admin/claim route that creates or resets the admin account.",
  );
}

// Header (not a body/additionalField) carrying the claim token on the
// server-side signUpEmail call from src/data/adminClaim.ts — see the
// databaseHooks comment below for why a header, not a field, is required.
export const ADMIN_CLAIM_TOKEN_HEADER = "x-admin-claim-token";

function isReservedAdminEmail(email: string): boolean {
  const normalized = email.toLowerCase();
  return (
    normalized === adminEmail!.toLowerCase() ||
    (!!adminEmailBackup && normalized === adminEmailBackup.toLowerCase())
  );
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(drizzle(sql()), {
    provider: "pg",
    schema: authSchema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  session: {
    expiresIn: ANONYMOUS_SESSION_EXPIRES_IN_SECONDS,
  },
  databaseHooks: {
    user: {
      create: {
        before: async (user, context) => {
          if (isReservedAdminEmail(user.email)) {
            // The claim token travels as a request header (ADMIN_CLAIM_TOKEN_HEADER
            // below), not a body field / additionalField. Better Auth's
            // create.before hook merges its returned `data` back onto the
            // original payload with `{ ...actualData, ...result.data }`
            // (src/db/with-hooks.mjs) — a plain object spread can only
            // overwrite keys, never delete one, so there is no way to hand
            // back "data minus one field" and have it actually excluded
            // from the row Drizzle inserts (it fails
            // "field does not exist in the user Drizzle schema" instead).
            // Routing the token through a header sidesteps that entirely:
            // it never becomes part of `data`, so nothing needs stripping.
            const token = context?.headers?.get(ADMIN_CLAIM_TOKEN_HEADER);
            if (token !== adminClaimToken) {
              // Generic message on purpose — don't reveal that this email
              // is special to an unauthenticated caller probing the signup
              // form.
              throw new APIError("BAD_REQUEST", { message: "Email unavailable." });
            }
          }
          return { data: user };
        },
      },
    },
  },
  plugins: [
    // Every visitor — guest or logged-in — gets a real session and user.id
    // from first page load; see the client-side bootstrap in __root.tsx.
    //
    // Known follow-up: user rows created by anonymous sign-in are never
    // cleaned up when their session expires — no TTL/cron job exists yet.
    // The `anonymous` plugin itself has no session-expiry option; the 30-day
    // expiry above (top-level `session.expiresIn`) applies to it too.
    anonymous({
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        await mergeAnonymousUserData(anonymousUser.user.id, newUser.user.id);
      },
    }),
    tanstackStartCookies(),
  ],
});