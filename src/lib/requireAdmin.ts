/**
 * Minimal server-side admin-session check — a stopgap ahead of the eventual
 * Better Auth integration.
 *
 * Today, admin auth is entirely client-side (a passcode hash in Postgres,
 * checked from the browser, with a sessionStorage flag flipped on success).
 * That means any request that reaches an admin-mutating server function
 * directly — bypassing the React admin UI — succeeds no matter what. This
 * file is the actual security boundary: a single HMAC-signed cookie, no
 * session store, no roles.
 *
 * When Better Auth replaces this, only the internals below should change —
 * call sites (`await requireAdmin()` as the first line of a handler) should
 * not need to change.
 */

import { getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";

const COOKIE_NAME = "omnimedia_admin_session";
const MAX_AGE_SECONDS = 12 * 60 * 60; // 12 hours

interface SessionPayload {
  admin: true;
  iat: number;
}

/**
 * Requires a random 32+ byte secret in `process.env.ADMIN_SESSION_SECRET`.
 * Not set by default — add it to `.env.local` for local dev and to the
 * Vercel project's environment variables for production. There is
 * deliberately no fallback: a misconfigured deploy must fail loudly (every
 * admin action rejected) rather than silently accept unsigned sessions.
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

function fromBase64Url(str: string): Uint8Array {
  const normalized = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

async function signSession(payload: SessionPayload): Promise<string> {
  const key = await hmacKey(getSecret());
  const payloadB64 = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payloadB64));
  return `${payloadB64}.${toBase64Url(new Uint8Array(signature))}`;
}

async function verifySession(token: string): Promise<SessionPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;

  const key = await hmacKey(getSecret());
  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    fromBase64Url(sigB64),
    new TextEncoder().encode(payloadB64),
  );
  if (!valid) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(fromBase64Url(payloadB64))) as SessionPayload;
    if (payload.admin !== true || typeof payload.iat !== "number") return null;
    return payload;
  } catch {
    return null;
  }
}

/**
 * Issue the signed admin session cookie. Call this on successful passcode
 * verification (see the login handler in src/data/adminRecovery.ts) —
 * never anywhere else.
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

/** Clears the admin session cookie (logout). */
export function clearAdminSession(): void {
  deleteCookie(COOKIE_NAME, { path: "/" });
}

/**
 * Throws if the current request does not carry a valid, unexpired admin
 * session cookie. Call as the first line of every admin-mutating server
 * function handler — this is the real access-control gate; nothing
 * client-side (sessionStorage, the React admin UI) should be trusted.
 */
export async function requireAdmin(): Promise<void> {
  const token = getCookie(COOKIE_NAME);
  if (!token) throw new Error("Admin authentication required.");

  const payload = await verifySession(token);
  if (!payload) throw new Error("Admin authentication required.");

  if (Date.now() - payload.iat > MAX_AGE_SECONDS * 1000) {
    throw new Error("Admin session expired.");
  }
}
