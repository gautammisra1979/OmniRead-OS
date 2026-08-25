import { createServerFn } from "@tanstack/react-start";
import type Stripe from "stripe";
import { stripe } from "~/lib/stripe";
import { getCart, getRecoveryPromoCode } from "~/data/cart";
import { getCatalogItemById } from "~/db/queries";
import { getPromoSettings, calculateDiscountedPrice, type PromoOverride } from "~/data/promotions";
import { getUserId } from "~/lib/getUserId";

/**
 * Real Stripe Checkout Sessions (redirect-based — no Stripe.js needed).
 * Replaces the old full localStorage simulation. Purchase *completion* is
 * no longer client-triggered: it happens server-side in the webhook
 * (src/routes/api/stripe/webhook.ts) once Stripe confirms payment, which is
 * also the only place downloads rows get written now.
 */

/**
 * Real, current charge price for one catalog item, matching exactly what
 * product.$productId.tsx displays via applyRecoveryDiscount() (see
 * src/data/products.ts): an active recovery discount overrides *everything
 * else* for that visitor's own checkout, including any per-item
 * promoOverride on the catalog row itself, not just the storewide promo.
 * That's why `recovery`, when present, replaces the override argument
 * entirely rather than only feeding into the settings object — passing
 * catalogItem.promoOverride through unchanged in that case would let a
 * per-item override outrank the recovery discount, which is not what the
 * buyer was shown on the product page.
 */
function realChargePrice(
  catalogItem: { price: number; promoOverride?: PromoOverride | null; type: "ebook" | "audiobook" | "video" },
  settings: Awaited<ReturnType<typeof getPromoSettings>>,
  recovery: { code: string; discount: number } | null,
): number {
  const override: PromoOverride | null | undefined = recovery
    ? { hasOverride: true, overrideType: "percentage", overrideValue: recovery.discount }
    : catalogItem.promoOverride;
  const { discounted } = calculateDiscountedPrice(catalogItem.price, override, settings, catalogItem.type);
  return discounted;
}

export interface SingleItemCheckout {
  productId: string;
  quantity: number;
}

const dbCreateCheckoutSession = createServerFn({ method: "POST" })
  .validator((data: SingleItemCheckout | null) => data)
  .handler(async ({ data: singleItem }): Promise<{ url: string }> => {
    const userId = await getUserId();

    // "Buy Now" (singleItem present) checks out exactly the clicked item,
    // regardless of anything else sitting in the buyer's cart — a buyer
    // clicking "Buy Now" on product B doesn't expect product A, added to
    // their cart earlier and unrelated to this purchase, to get charged
    // too. Full-cart checkout (singleItem absent) is unchanged.
    const items: Array<{ productId: string; quantity: number }> = singleItem
      ? [singleItem]
      : (await getCart()).items;
    if (items.length === 0) {
      throw new Error("Cannot start checkout with an empty cart.");
    }

    const [settings, recovery] = await Promise.all([getPromoSettings(), getRecoveryPromoCode()]);

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];
    for (const item of items) {
      // Real, current catalog row — never the cart's own stored price/title,
      // which the client controls and could have gone stale or been tampered
      // with client-side.
      const catalogItem = await getCatalogItemById({ data: item.productId });
      if (!catalogItem) continue; // stale cart row for a since-deleted product

      const discounted = realChargePrice(catalogItem, settings, recovery);

      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: catalogItem.title,
            images: catalogItem.coverImage ? [catalogItem.coverImage] : undefined,
          },
          unit_amount: Math.round(discounted * 100),
        },
        quantity: item.quantity,
        // Read back by the webhook (session.line_items.data[].metadata) to
        // identify which catalog item each line item is, without re-joining
        // against the live cart — see webhook.ts for why.
        metadata: { productId: catalogItem.id },
      });
    }
    if (lineItems.length === 0) {
      throw new Error(
        singleItem
          ? "This item is no longer available."
          : "Cannot start checkout with an empty cart.",
      );
    }

    const origin = process.env.BETTER_AUTH_URL;
    if (!origin) {
      throw new Error(
        "BETTER_AUTH_URL is not set — required to build the Stripe success/cancel redirect URLs.",
      );
    }

    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: lineItems,
      metadata: { userId },
      success_url: `${origin}/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/downloads`,
    });
    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    return { url: session.url };
  },
);

/**
 * `singleItem` bypasses the persisted cart entirely and checks out exactly
 * that one { productId, quantity } — this is what "Buy Now" uses. Omit it
 * (or pass nothing) to check out the buyer's full cart, unchanged from
 * before.
 */
export async function createCheckoutSession(singleItem?: SingleItemCheckout): Promise<{ url: string }> {
  return dbCreateCheckoutSession({ data: singleItem ?? null });
}

/**
 * Thin public wrapper for the client to call to start a real checkout.
 * Returns the same `redirectUrl` field the old simulated version returned,
 * so existing callers only need to redirect the browser to it — but it now
 * points at Stripe's own hosted Checkout page, not directly at
 * /checkout-success. Stripe redirects back to success_url only after
 * payment actually completes.
 */
export async function initiateCheckout(singleItem?: SingleItemCheckout): Promise<{ redirectUrl: string }> {
  const { url } = await createCheckoutSession(singleItem);
  return { redirectUrl: url };
}

/**
 * Shared "Buy Now" action for product.$productId.tsx and QuizResults.tsx:
 * starts a real, single-item Stripe checkout for exactly this product
 * (quantity 1) and redirects the browser to it. Callers own their own
 * loading/error UI state around this call — it either resolves by
 * navigating away, or throws.
 */
export async function buyNow(productId: string): Promise<void> {
  const { redirectUrl } = await initiateCheckout({ productId, quantity: 1 });
  window.location.href = redirectUrl;
}
