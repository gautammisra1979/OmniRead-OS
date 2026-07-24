import { getCookie, setCookie } from "@tanstack/react-start/server";

/**
 * Better Auth isn't wired up yet, so cart/wallet/loyalty rows can't use a
 * real user_id FK. This is a browser-scoped anonymous ID stored in a
 * long-lived cookie, used purely as a placeholder ownerId column value —
 * swap for a real user_id once Better Auth lands.
 *
 * Only call from inside a server function handler (createServerFn), since it
 * relies on TanStack Start's request-scoped cookie context.
 */

const OWNER_ID_COOKIE = "omnimedia_owner_id";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function getOrCreateOwnerId(): string {
  const existing = getCookie(OWNER_ID_COOKIE);
  if (existing) return existing;

  const id = crypto.randomUUID();
  setCookie(OWNER_ID_COOKIE, id, {
    maxAge: ONE_YEAR_SECONDS,
    path: "/",
    sameSite: "lax",
  });
  return id;
}
