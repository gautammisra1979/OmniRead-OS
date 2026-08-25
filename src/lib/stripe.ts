import Stripe from "stripe";

/**
 * Server-only handle to the store owner's own Stripe account (BYO-Stripe —
 * same pattern as BLOB_MEDIA_READ_WRITE_TOKEN etc.). Resolved lazily and
 * cached after first use, mirroring src/db.ts's sql() accessor: the site
 * still builds and serves before Stripe is connected, and the error only
 * surfaces if checkout/webhook code actually runs without the key.
 */
let client: Stripe | null = null;

export function stripe(): Stripe {
  if (client) return client;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set — add it to .env.local (dev) and the Vercel project's environment variables (prod) before checkout can work.",
    );
  }
  client = new Stripe(key);
  return client;
}
