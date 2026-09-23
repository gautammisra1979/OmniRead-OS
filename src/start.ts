import { createStart, createMiddleware } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";

/**
 * Session 56: security headers. The policy needs a fresh per-request nonce
 * for the one inline <script> this app ships (TanStack Start's own
 * `$tsr-stream-barrier` hydration/dehydration bootstrap, injected by
 * router.options.ssr.nonce — see src/router.tsx) — 'unsafe-inline' on
 * script-src was ruled out on purpose. Generated once per request here and
 * threaded to router.tsx via context so both the header and the injected
 * script agree on the same value.
 *
 * Vercel's public Blob store hostname below is a wildcard scoped to
 * Vercel's own Blob domain rather than this store's specific account
 * subdomain — this codebase is resold as a template, and each buyer's
 * Blob store gets a different subdomain under the same domain.
 */
const BLOB_PUBLIC_HOST = "https://*.public.blob.vercel-storage.com";

function buildCsp(nonce: string): string {
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
    `img-src 'self' data: ${BLOB_PUBLIC_HOST}`,
    `media-src 'self' blob: ${BLOB_PUBLIC_HOST}`,
    "connect-src 'self' https://www.googleapis.com",
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
