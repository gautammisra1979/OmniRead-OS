import { betterAuth, APIError } from "better-auth";
import { anonymous } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/neon-http";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { importPKCS8, SignJWT } from "jose";
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

/**
 * Sign in with Apple's client secret isn't a static string like every other
 * provider's — Apple requires a short-lived JWT, signed with the Services
 * ID's own `.p8` private key, in its place. This is Better Auth's own
 * documented helper for producing it
 * (https://better-auth.com/docs/authentication/apple) — it isn't a package
 * export, it's a snippet their docs hand you to paste into your own config
 * — copied here verbatim rather than hand-rolled. It's called fresh from
 * inside the `apple` provider factory below (not memoized), so every server
 * boot / cold start mints a new 180-day-lived token, which is what keeps it
 * "rotated" without a background job — 180 days is comfortably under
 * Apple's hard 15,777,000-second (~6 month) ceiling on how far in the
 * future this JWT's expiry may be set. The one scenario that isn't covered:
 * a deployment that runs uninterrupted with no redeploy or cold start for
 * 180+ days would need an explicit restart to mint a fresh one.
 */
async function generateAppleClientSecret(
  clientId: string,
  teamId: string,
  keyId: string,
  privateKey: string,
): Promise<string> {
  const key = await importPKCS8(privateKey, "ES256");
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({})
    .setProtectedHeader({ alg: "ES256", kid: keyId })
    .setIssuer(teamId)
    .setSubject(clientId)
    .setAudience("https://appleid.apple.com")
    .setIssuedAt(now)
    .setExpirationTime(now + 180 * 24 * 60 * 60)
    .sign(key);
}

const appleClientId = process.env.APPLE_CLIENT_ID;
const appleTeamId = process.env.APPLE_TEAM_ID;
const appleKeyId = process.env.APPLE_KEY_ID;
const applePrivateKey = process.env.APPLE_PRIVATE_KEY;

/**
 * Sign in with Apple is fully opt-in — same BYO-credentials shape as
 * stripe() (src/lib/stripe.ts): a storeowner who hasn't paid for an Apple
 * Developer account shouldn't see a broken or missing button, just no
 * button at all. APPLE_CLIENT_ID (the Services ID — the one of the four
 * values that isn't itself a secret) is the sentinel: unset means Apple
 * sign-in hasn't been touched at all, so `socialProviders.apple` is omitted
 * entirely below and AdminLogin.tsx's Apple button simply doesn't render —
 * no error, no log, graceful opt-out by omission.
 *
 * Once that sentinel IS set, the other three are load-bearing — there's no
 * such thing as "half-configured" Apple sign-in. Unlike ADMIN_EMAIL /
 * ADMIN_CLAIM_TOKEN above, though, this doesn't throw: a storeowner
 * mid-setup (e.g. they've pasted the Services ID but not yet downloaded the
 * .p8 key) shouldn't take the entire site down over a feature nobody else
 * depends on. Instead it logs which var(s) are missing and disables just
 * Apple — every other sign-in path keeps working.
 */
function resolveAppleConfigured(): boolean {
  if (!appleClientId) return false;
  const missing = [
    !appleTeamId && "APPLE_TEAM_ID",
    !appleKeyId && "APPLE_KEY_ID",
    !applePrivateKey && "APPLE_PRIVATE_KEY",
  ].filter((name): name is string => !!name);
  if (missing.length > 0) {
    console.error(
      `[auth] APPLE_CLIENT_ID is set but ${missing.join(", ")} ${missing.length > 1 ? "are" : "is"} missing. ` +
        "Sign in with Apple needs all four env vars together, so it's disabled until the rest are set — " +
        "add them to .env.local (dev) and the Vercel project's environment variables (prod).",
    );
    return false;
  }
  return true;
}

export const appleConfigured = resolveAppleConfigured();

function isReservedAdminEmail(email: string): boolean {
  const normalized = email.toLowerCase();
  return (
    normalized === adminEmail!.toLowerCase() ||
    (!!adminEmailBackup && normalized === adminEmailBackup.toLowerCase())
  );
}

/**
 * Better Auth defaults trustedOrigins to just [baseURL] when omitted,
 * which rejects requests from any other origin — this is what caused
 * a same-password auth failure when a request came from :3001 while
 * BETTER_AUTH_URL pointed at :3000 (Session 17). Always trust
 * BETTER_AUTH_URL itself; in non-production, also trust the two local
 * dev ports this project's two-terminal setup uses. An optional
 * BETTER_AUTH_TRUSTED_ORIGINS env var (comma-separated) lets a
 * self-hosted buyer add additional origins — staging domains, custom
 * ports — without editing source.
 */
function getTrustedOrigins(): string[] {
  const origins = new Set<string>();

  if (process.env.BETTER_AUTH_URL) {
    origins.add(process.env.BETTER_AUTH_URL);
  }

  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://localhost:3001");
  }

  const extra = process.env.BETTER_AUTH_TRUSTED_ORIGINS;
  if (extra) {
    for (const origin of extra.split(",")) {
      const trimmed = origin.trim();
      if (trimmed) origins.add(trimmed);
    }
  }

  if (appleConfigured) {
    // Sign in with Apple is the one provider that answers the OAuth
    // callback as a top-level form POST from Apple's own origin
    // (responseMode: "form_post" — see @better-auth/core's apple.ts),
    // rather than a redirect we initiate. Better Auth's own docs list this
    // origin in trustedOrigins for exactly that reason.
    origins.add("https://appleid.apple.com");
  }

  return Array.from(origins);
}

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  trustedOrigins: getTrustedOrigins(),
  database: drizzleAdapter(drizzle(sql()), {
    provider: "pg",
    schema: authSchema,
  }),
  emailAndPassword: {
    enabled: true,
  },
  // Deliberately NOT setting account.accountLinking.updateUserInfoOnLink or
  // apple's own overrideUserInfoOnSignIn: Apple only sends the user's name
  // (and, per Apple's docs, reliably sends email) on the very first
  // authorization — there is no endpoint to fetch either again later. The
  // defaults below leave that first-callback name/email on the user row
  // alone on every subsequent Apple sign-in, rather than risking it being
  // overwritten with blanks once Apple stops including them.
  socialProviders: appleConfigured
    ? {
        apple: async () => ({
          clientId: appleClientId!,
          clientSecret: await generateAppleClientSecret(
            appleClientId!,
            appleTeamId!,
            appleKeyId!,
            applePrivateKey!,
          ),
        }),
      }
    : undefined,
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
    //
    // Confirmed against source (node_modules/better-auth/dist/plugins/
    // anonymous/index.mjs) that onLinkAccount fires for Apple sign-in too,
    // not just email/password: its hook matcher matches any path starting
    // with "/callback" or "/oauth2/callback", which is exactly the social
    // OAuth callback route ("/callback/:id" — see
    // node_modules/better-auth/dist/api/routes/callback.mjs) that Apple's
    // sign-in completes through. The matcher itself is provider-agnostic —
    // it only inspects whether a new (non-anonymous) session was just
    // issued while an anonymous one was active — so no Apple-specific
    // wiring was needed here.
    anonymous({
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        await mergeAnonymousUserData(anonymousUser.user.id, newUser.user.id);
      },
    }),
    tanstackStartCookies(),
  ],
});