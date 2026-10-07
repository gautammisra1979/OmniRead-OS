const DEFAULT_TTL_SECONDS = 3600;
const MIN_TTL_SECONDS = 60;
const MAX_TTL_SECONDS = 86400;

/** Lifetime of signed media URLs. MEDIA_URL_TTL_SECONDS is read at call time. */
export function mediaUrlTtlSeconds(): number {
  const raw = process.env.MEDIA_URL_TTL_SECONDS?.trim();
  if (!raw) return DEFAULT_TTL_SECONDS;
  const n = Number(raw);
  if (!Number.isFinite(n)) return DEFAULT_TTL_SECONDS;
  return Math.min(MAX_TTL_SECONDS, Math.max(MIN_TTL_SECONDS, Math.floor(n)));
}
