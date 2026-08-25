import { createFileRoute } from "@tanstack/react-router";
import type Stripe from "stripe";
import { stripe } from "~/lib/stripe";
import { getCatalogItemById } from "~/db/queries";
import { insertDownloadIfNew } from "~/data/downloads";
import { creditAffiliateForPurchaseForBuyer } from "~/data/affiliateProgram";
import { removeCartItemsForUser } from "~/data/cart";

/**
 * Stripe webhook — the real purchase-completion work now happens here,
 * server-side, once Stripe confirms payment. Never trust anything about a
 * purchase from a client request again (that was the old completeCheckout()
 * trust-boundary hole — see checkout-success.tsx).
 *
 * Design judgment call: purchased items are derived from Stripe's own
 * session.line_items (what was actually charged, retrieved fresh from
 * Stripe), not by re-reading the buyer's live cart. The cart can change
 * between checkout-session creation and webhook delivery (items
 * added/removed, prices/promos changed) — re-joining against it here could
 * record a different purchase than what was actually paid for. Each line
 * item carries the catalog productId as its own metadata (set at session
 * creation in src/data/stripeCheckout.ts), which is what ties it back to a
 * real catalog row.
 *
 * Only checkout.session.completed is handled here. charge.refunded /
 * payment_intent.canceled-type events are the separate Real Refunds
 * follow-on's territory — it extends this same file, not a second one.
 */
export const Route = createFileRoute("/api/stripe/webhook")({
  server: {
    handlers: {
      POST: async ({ request }: { request: Request }) => {
        // Signature verification needs the exact raw bytes — must read as
        // text before any JSON parsing, and before anything else can touch
        // the body.
        const rawBody = await request.text();
        const signature = request.headers.get("stripe-signature");

        let event: Stripe.Event;
        try {
          if (!signature) throw new Error("Missing stripe-signature header");
          const secret = process.env.STRIPE_WEBHOOK_SECRET;
          if (!secret) throw new Error("STRIPE_WEBHOOK_SECRET is not set");
          event = await stripe().webhooks.constructEventAsync(rawBody, signature, secret);
        } catch (error) {
          console.error("[stripe webhook] signature verification failed:", error);
          return new Response("Invalid signature", { status: 400 });
        }

        if (event.type === "checkout.session.completed") {
          await handleCheckoutSessionCompleted(event);
        }

        // Ack fast — Stripe expects a quick response. No queue/background-job
        // infrastructure exists in this app (same "no cron" reasoning as the
        // affiliate module), so the work above runs inline; flag if checkout
        // volume ever makes that a real latency concern.
        return new Response("ok", { status: 200 });
      },
    },
  },
});

async function handleCheckoutSessionCompleted(event: Stripe.Event): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;

  const userId = session.metadata?.userId;
  if (!userId) {
    console.error(`[stripe webhook] session ${session.id} has no metadata.userId — cannot fulfill`);
    return;
  }

  const paymentIntentId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);

  const full = await stripe().checkout.sessions.retrieve(session.id, {
    expand: ["line_items", "line_items.data.price"],
  });

  const purchasedProductIds: string[] = [];

  for (const lineItem of full.line_items?.data ?? []) {
    const productId = lineItem.metadata?.productId;
    if (!productId) continue;
    purchasedProductIds.push(productId);

    const item = await getCatalogItemById({ data: productId });
    if (!item) continue;

    const unitAmountCents = lineItem.price?.unit_amount ?? 0;

    const inserted = await insertDownloadIfNew({
      userId,
      productId,
      productTitle: item.title,
      productAuthor: item.author,
      productType: item.type,
      price: unitAmountCents / 100,
      purchasedAt: new Date(event.created * 1000),
      sessionId: session.id,
      stripePaymentIntentId: paymentIntentId,
    });

    // null means this (sessionId, productId) pair was already recorded —
    // a redelivered webhook event for a session already processed. Skip
    // silently; this is the expected, safe-by-construction retry path.
    if (!inserted) continue;

    // A broken affiliate credit must never fail the webhook response.
    try {
      await creditAffiliateForPurchaseForBuyer(userId, {
        downloadId: inserted.id,
        productTitle: item.title,
        purchaseValue: unitAmountCents / 100,
      });
    } catch (error) {
      console.error(`[stripe webhook] affiliate credit failed for download ${inserted.id}:`, error);
    }
  }

  // Removed last, after downloads are written — a failure partway through
  // the loop above leaves the cart intact and the whole event retryable
  // (Stripe redelivers on non-2xx / timeout) rather than silently losing
  // the purchase. Scoped to exactly the productIds this session charged
  // for (Buy Now bypasses the cart, so a full clear here would also wipe
  // out unrelated items the buyer still has sitting in their cart).
  await removeCartItemsForUser(userId, purchasedProductIds);
}
