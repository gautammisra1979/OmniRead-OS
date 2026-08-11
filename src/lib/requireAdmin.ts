/**
 * Server-side admin-session check, backed by Better Auth.
 *
 * `requireAdmin()` reads the incoming request's Better Auth session and
 * compares the signed-in user's email (case-insensitively) against
 * `ADMIN_EMAIL` / `ADMIN_EMAIL_BACKUP`, read live from `process.env` on
 * every call. Admin status is NOT persisted anywhere — no DB role, no flag
 * on the user row — so editing `ADMIN_EMAIL` in Vercel's env vars changes
 * who's admin on the very next request, for whichever account is signed in
 * under that address. See src/lib/auth.ts for the matching guard on the
 * signup side (databaseHooks.user.create.before, which reserves these
 * emails) and src/routes/admin_.claim.tsx, the only way to create or reset
 * the account attached to one of them. This is the real access-control
 * gate — nothing client-side (sessionStorage, the React admin UI) should
 * be trusted.
 *
 * The previous implementation (a standalone HMAC-signed cookie, no session
 * store, no roles) is preserved below: the verification half is commented
 * out as a rollback reference (see the LEGACY block), but `signSession()`
 * and its helpers stay live and exported via `issueAdminSession()` /
 * `clearAdminSession()`, which are still used by
 * src/data/adminRecovery.ts's passcode login/logout path. That path remains
 * in place (unused by the admin UI now) per the Better Auth migration plan.
 * `ADMIN_SESSION_SECRET` is likewise left in place for the same reason.
 */

import { getRequestHeaders, setCookie, deleteCookie } from "@tanstack/react-start/server";
import { auth } from "~/lib/auth";

const COOKIE_NAME = "omnimedia_admin_session";
const MAX_AGE_SECONDS = 12 * 60 * 60; // 12 hours

interface SessionPayload {
  admin: true;
  iat: number;
}

/**
 * Requires a random 32+ byte secret in `process.env.ADMIN_SESSION_SECRET`.
 * Not set by default — add it to `.env.local` for local dev and to the
 * Vercel project's environment variables for production.
 */
function getSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) {
    throw new Error(
      "ADMIN_SESSION_SECRET is not set. Generate a random 32+ byte string " +
        "and add it to .env.local (dev) and the Vercel project's " +
        "environment variables (prod) before any admin action can work.",
    );
  }
  return secret;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function signSession(payload: SessionPayload): Promise<string> {
  const key = await hmacKey(getSecret());
  const payloadB64 = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  return `${payloadB64}.${toBase64Url(new Uint8Array(signature))}`;
}

/**
 * Throws if the current request does not carry a valid Better Auth session
 * whose email matches `ADMIN_EMAIL` / `ADMIN_EMAIL_BACKUP`. Call as the
 * first line of every admin-mutating server function handler.
 */
export async function requireAdmin(): Promise<void> {
  const session = await auth.api.getSession({ headers: getRequestHeaders() });
  if (!session) throw new Error("Admin authentication required.");
  if (!isAdminEmail(session.user.email)) throw new Error("Admin authentication required.");
}

function isAdminEmail(email: string): boolean {
  const normalized = email.toLowerCase();
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  const adminEmailBackup = process.env.ADMIN_EMAIL_BACKUP?.toLowerCase();
  return (!!adminEmail && normalized === adminEmail) || (!!adminEmailBackup && normalized === adminEmailBackup);
}

/* ────────────────────────────────────────────────────────────────────────
 * LEGACY — HMAC-signed-cookie verification (pre-Better-Auth stopgap).
 *
 * This is the half of the old implementation that requireAdmin() itself
 * used to run: decode the cookie, verify its signature, check expiry. It's
 * superseded by the Better Auth session + role check above and is no
 * longer called from anywhere. Left commented out, not deleted, so this
 * swap can be rolled back by restoring this block and pointing
 * requireAdmin() at legacyRequireAdmin() again. (signSession() and its
 * dependencies above stay live — issueAdminSession() below still needs
 * them.)
 *
 * function fromBase64Url(str: string): Uint8Array {
 *   const normalized = str.replace(/-/g, "+").replace(/_/g, "/");
 *   const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
 *   const binary = atob(padded);
 *   const bytes = new Uint8Array(binary.length);
 *   for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
 *   return bytes;
 * }
 *
 * async function verifySession(token: string): Promise<SessionPayload | null> {
 *   const parts = token.split(".");
 *   if (parts.length !== 2) return null;
 *   const [payloadB64, sigB64] = parts;
 *
 *   const key = await hmacKey(getSecret());
 *   const valid = await crypto.subtle.verify(
 *     "HMAC",
 *     key,
 *     fromBase64Url(sigB64),
 *     new TextEncoder().encode(payloadB64),
 *   );
 *   if (!valid) return null;
 *
 *   try {
 *     const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(payloadB64))) as SessionPayload;
 *     if (payload.admin !== true || typeof payload.iat !== "number") return null;
 *     return payload;
 *   } catch {
 *     return null;
 *   }
 * }
 *
 * async function legacyRequireAdmin(): Promise<void> {
 *   const token = getCookie(COOKIE_NAME);
 *   if (!token) throw new Error("Admin authentication required.");
 *
 *   const payload = await verifySession(token);
 *   if (!payload) throw new Error("Admin authentication required.");
 *
 *   if (Date.now() - payload.iat > MAX_AGE_SECONDS * 1000) {
 *     throw new Error("Admin session expired.");
 *   }
 * }
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Issue the signed admin session cookie. Still called by the legacy
 * passcode login handler in src/data/adminRecovery.ts (dbLoginAdmin) —
 * that path is no longer reachable from the admin UI but is left
 * functional per the migration plan.
 */
export async function issueAdminSession(): Promise<void> {
  const token = await signSession({ admin: true, iat: Date.now() });
  setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

/** Clears the legacy admin session cookie (logout). */
export function clearAdminSession(): void {
  deleteCookie(COOKIE_NAME, { path: "/" });
}
