import { getRequestHeaders } from "@tanstack/react-start/server";
import { sql } from "~/db";
import { getClientIpHeader } from "~/lib/appEnv";

// Chance, on any given checkRateLimit call, that this call also prunes
// expired rows — not a security-sensitive choice, plain Math.random() is fine.
const PRUNE_PROBABILITY = 0.01;
// How old a row's window_start must be before it's eligible for pruning.
// Must stay comfortably larger than the longest window any caller uses
// (currently 900 seconds, the per-email magic-link throttle) — an expired row is already treated exactly like a
// missing row by checkRateLimit's upsert, so this can never affect limiter
// behaviour, only table size.
const PRUNE_AFTER_SECONDS = 3600;

/**
 * IP extraction reads the header named by getClientIpHeader() (CLIENT_IP_HEADER,
 * default x-forwarded-for) — the same header Better Auth's limiter uses (auth.ts
 * sets advanced.ipAddress.ipAddressHeaders to it). The leftmost (original
 * client) entry is taken from a comma-separated chain, which is harmless for
 * single-value headers like cf-connecting-ip. This project doesn't configure
 * advanced.ipAddress.trustedProxies on the Better Auth instance, so this
 * mirrors the same single-header convention rather than Better Auth's
 * stricter multi-hop-without-trustedProxies rejection — good enough for keying
 * a fixed-window counter, not a security boundary in itself.
 */
function getClientIp(): string {
  const forwardedFor = getRequestHeaders().get(getClientIpHeader());
  if (forwardedFor) {
    const first = forwardedFor.split(",")[0]?.trim();
    if (first) return first;
  }
  return "unknown";
}

/**
 * Fixed-window rate limit check, atomic via a single upsert. Returns true if
 * the call is allowed, false if the key has exceeded max hits within the
 * current window. Resets the window automatically once windowSeconds has
 * elapsed since the window's start.
 */
export async function checkRateLimit(
  key: string,
  windowSeconds: number,
  max: number,
): Promise<boolean> {
  const rows = await sql()`
    INSERT INTO rate_limit_hits (key, count, window_start)
    VALUES (${key}, 1, now())
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN now() - rate_limit_hits.window_start > (${windowSeconds} || ' seconds')::interval
          THEN 1
        ELSE rate_limit_hits.count + 1
      END,
      window_start = CASE
        WHEN now() - rate_limit_hits.window_start > (${windowSeconds} || ' seconds')::interval
          THEN now()
        ELSE rate_limit_hits.window_start
      END
    RETURNING count
  `;
  const count = Number(rows[0]?.count ?? 1);

  if (Math.random() < PRUNE_PROBABILITY) {
    try {
      await sql()`DELETE FROM rate_limit_hits WHERE window_start < now() - (${PRUNE_AFTER_SECONDS} || ' seconds')::interval`;
    } catch (err) {
      console.error("rate_limit_hits prune failed:", err);
    }
  }

  return count <= max;
}

/** Fixed-window rate limit check keyed to the caller's request IP. */
export async function checkRateLimitByIp(
  prefix: string,
  windowSeconds: number,
  max: number,
): Promise<boolean> {
  return checkRateLimit(`${prefix}:${getClientIp()}`, windowSeconds, max);
}
