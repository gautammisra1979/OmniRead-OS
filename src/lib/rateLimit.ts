import { getRequestHeaders } from "@tanstack/react-start/server";
import { sql } from "~/db";

/**
 * IP extraction matches Better Auth's own default (@better-auth/core's
 * getIp / DEFAULT_IP_HEADERS): x-forwarded-for is the only header checked,
 * with the leftmost (original client) entry taken from the comma-separated
 * chain. This project doesn't configure advanced.ipAddress.trustedProxies
 * on the Better Auth instance (auth.ts), so this mirrors the same
 * single-header convention rather than Better Auth's stricter
 * multi-hop-without-trustedProxies rejection — good enough for keying a
 * fixed-window counter, not a security boundary in itself.
 */
function getClientIp(): string {
  const forwardedFor = getRequestHeaders().get("x-forwarded-for");
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
