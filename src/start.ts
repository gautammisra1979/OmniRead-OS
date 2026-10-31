import { createStart, createMiddleware } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { getStorage } from "~/lib/storage";

/**
 * Session 56: security headers. The policy needs a fresh per-request nonce
 * for the one inline <script> this app ships (TanStack Start's own
 * `$tsr-stream-barrier` hydration/dehydration bootstrap, injected by
 * router.options.ssr.nonce — see src/router.tsx) — 'unsafe-inline' on
 * script-src was ruled out on purpose. Generated once per request here and
 * threaded to router.tsx via context so both the header and the injected
 * script agree on the same value.
 *
 * img-src and media-src are 'self' (plus data: / blob:) and the sources the
 * active storage adapter reports (getStorage().cspSources(), resolved per
 * request). The Vercel Blob adapter uses wildcards scoped to Vercel's own Blob
 * domain rather than this store's specific account subdomain — this codebase
 * is resold as a template, and each buyer's Blob store gets a different
 * subdomain under the same domain. The S3-API (r2) adapter instead reports
 * the exact public origin and the path-scoped private bucket URL, never a
 * wildcard. If the adapter cannot be resolved, both fall back so the header
 * is always set: to 'self' only (plus data: / blob:) when STORAGE_PROVIDER is
 * not vercel-blob (r2 or unknown), and to the public Blob wildcard on the
 * Vercel path (provider unset or vercel-blob).
 *
 * connect-src is 'self' plus the sources the active storage adapter needs
 * for browser-direct uploads (getStorage().cspConnectOrigins(), resolved per
 * request). If the adapter cannot be resolved, it falls back to 'self' only.
 */
const FALLBACK_PUBLIC_SOURCE = "https://*.public.blob.vercel-storage.com";

function imgAndMediaSrc(): { img: string; media: string } {
  try {
    const { img, media } = getStorage().cspSources();
    return {
      img: ["'self'", "data:", ...img].join(" "),
      media: ["'self'", "blob:", ...media].join(" "),
    };
  } catch (err) {
    console.error("CSP: storage img/media sources unavailable, using fallback:", err);
    // Read per call, like getStorage(). Never widen to the Vercel wildcard
    // for a non-Vercel provider.
    const vercel = (process.env.STORAGE_PROVIDER || "vercel-blob") === "vercel-blob";
    const extra = vercel ? ` ${FALLBACK_PUBLIC_SOURCE}` : "";
    return {
      img: `'self' data:${extra}`,
      media: `'self' blob:${extra}`,
    };
  }
}

function connectSrc(): string {
  try {
    return ["'self'", ...getStorage().cspConnectOrigins()].join(" ");
  } catch (err) {
    console.error("CSP: storage connect-src unavailable, using 'self' only:", err);
    return "'self'";
  }
}

function buildCsp(nonce: string): string {
  const { img, media } = imgAndMediaSrc();
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}'`,
    // 'unsafe-inline' here is scoped to one known inline <style> block
    // (EvaluationScaffold.tsx's Google Fonts @import) — threading the same
    // per-request nonce through that deeply-nested component would need a
    // context provider wired from the root, which isn't a quick change, so
    // this is a documented, deliberate tradeoff rather than an oversight.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    `img-src ${img}`,
    `media-src ${media}`,
    `connect-src ${connectSrc()}`,
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}

const securityHeadersMiddleware = createMiddleware().server(async ({ next }) => {
  const nonce = crypto.randomUUID().replace(/-/g, "");
  setResponseHeader("Content-Security-Policy", buildCsp(nonce));
  return next({ context: { cspNonce: nonce } });
});

export const startInstance = createStart(() => ({
  requestMiddleware: [securityHeadersMiddleware],
}));
