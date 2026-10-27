/**
 * Host-neutral runtime configuration.
 *
 * APP_ENV is set per environment on every host (Vercel env vars today,
 * Wrangler vars on Cloudflare). Both email helpers fail safe when it is
 * unset or unrecognised: background email is logged instead of sent, and
 * unverified email providers stay blocked.
 *
 * CLIENT_IP_HEADER names the request header carrying the client IP. It must
 * be a header the host overwrites, never one the client can supply. Vercel
 * overwrites `x-forwarded-for`; Cloudflare appends to a client-supplied
 * `x-forwarded-for` (so its leftmost entry is spoofable) and sets
 * `cf-connecting-ip`, so Cloudflare deployments set
 * CLIENT_IP_HEADER=cf-connecting-ip.
 */

export type AppEnv = "production" | "preview" | "development";

export function getAppEnv(): AppEnv | null {
  const value = process.env.APP_ENV?.trim().toLowerCase();
  if (value === "production" || value === "preview" || value === "development") {
    return value;
  }
  return null;
}

export function canSendRealEmail(): boolean {
  return getAppEnv() === "production";
}

export function allowUnverifiedEmailProviders(): boolean {
  const env = getAppEnv();
  return env === "development" || env === "preview";
}

export function getClientIpHeader(): string {
  return process.env.CLIENT_IP_HEADER?.trim().toLowerCase() || "x-forwarded-for";
}
