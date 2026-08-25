import { createServerFn } from "@tanstack/react-start";
import { and, eq, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "~/db";
import { cartItems, cartState, type CartItemRow, type CartStateRow } from "~/db/schema";
import { getUserId } from "~/lib/getUserId";

/**
 * Phase 3 (Step 26): DB-backed cart, replacing the localStorage version.
 * Rows are keyed by the Better Auth user_id (src/lib/getUserId.ts) — every
 * visitor, guest or logged-in, has one via the `anonymous` plugin. Flight
 * Recorder calls that used to fire on every mutation here have been removed;
 * Postgres is the durability layer now, and its replacement audit trail is a
 * separate future task.
 *
 * Each public function below is a plain async wrapper around an internal
 * createServerFn — this keeps the original call signature (no `{ data }`
 * wrapper needed at call sites) while still routing the actual DB work
 * through a TanStack Start server function.
 */

export interface CartItem {
  productId: string;
  title: string;
  author: string;
  price: number;
  type: "ebook" | "audiobook" | "video";
  format: string;
  coverImage: string | null;
  quantity: number;
  addedAt: string; // ISO date
}

export interface CartState {
  items: CartItem[];
  lastActivity: string; // ISO date
  isAbandoned: boolean;
  abandonedAt: string | null;
  recoveryCoupon: string | null;
  recoveryDiscount: number | null; // percentage
  recoveryOffered: boolean;
  recoveryRedeemed: boolean;
}

const IDLE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const RECOVERY_COUPON = "WELCOME_BACK";
const RECOVERY_DISCOUNT = 15; // 15% off

function db() {
  return drizzle(sql());
}

function rowToCartItem(row: CartItemRow): CartItem {
  return {
    productId: row.productId,
    title: row.title,
    author: row.author,
    price: Number(row.price),
    type: row.type as CartItem["type"],
    format: row.format,
    coverImage: row.coverImage,
    quantity: row.quantity,
    addedAt: row.addedAt.toISOString(),
  };
}

type CartStateFields = Omit<CartState, "items">;

function defaultStateFields(): CartStateFields {
  return {
    lastActivity: new Date().toISOString(),
    isAbandoned: false,
    abandonedAt: null,
    recoveryCoupon: null,
    recoveryDiscount: null,
    recoveryOffered: false,
    recoveryRedeemed: false,
  };
}

function rowToStateFields(row: CartStateRow): CartStateFields {
  return {
    lastActivity: row.lastActivity.toISOString(),
    isAbandoned: row.isAbandoned,
    abandonedAt: row.abandonedAt ? row.abandonedAt.toISOString() : null,
    recoveryCoupon: row.recoveryCoupon,
    recoveryDiscount: row.recoveryDiscount,
    recoveryOffered: row.recoveryOffered,
    recoveryRedeemed: row.recoveryRedeemed,
  };
}

async function loadCart(userId: string): Promise<CartState> {
  const database = db();
  const [items, stateRows] = await Promise.all([
    database.select().from(cartItems).where(eq(cartItems.userId, userId)),
    database.select().from(cartState).where(eq(cartState.userId, userId)),
  ]);
  return {
    items: items.map(rowToCartItem),
    ...(stateRows[0] ? rowToStateFields(stateRows[0]) : defaultStateFields()),
  };
}

/** Upsert the cart_state row: creates it with defaults (overridden by `patch`)
 *  if missing, or applies `patch` on top of the existing row. `lastActivity`
 *  is always bumped to now. */
async function upsertCartState(
  database: ReturnType<typeof db>,
  userId: string,
  patch: Partial<{
    isAbandoned: boolean;
    abandonedAt: Date | null;
    recoveryCoupon: string | null;
    recoveryDiscount: number | null;
    recoveryOffered: boolean;
    recoveryRedeemed: boolean;
  }>,
): Promise<void> {
  const now = new Date();
  await database
    .insert(cartState)
    .values({
      userId,
      lastActivity: now,
      isAbandoned: patch.isAbandoned ?? false,
      abandonedAt: patch.abandonedAt ?? null,
      recoveryCoupon: patch.recoveryCoupon ?? null,
      recoveryDiscount: patch.recoveryDiscount ?? null,
      recoveryOffered: patch.recoveryOffered ?? false,
      recoveryRedeemed: patch.recoveryRedeemed ?? false,
    })
    .onConflictDoUpdate({
      target: cartState.userId,
      set: { lastActivity: now, ...patch },
    });
}

/* ─── Internal server functions ─── */

const dbGetCart = createServerFn({ method: "GET" }).handler(
  async (): Promise<CartState> => loadCart(await getUserId()),
);

const dbAddToCart = createServerFn({ method: "POST" })
  .validator((item: Omit<CartItem, "addedAt">) => item)
  .handler(async ({ data: item }): Promise<CartState> => {
    const userId = await getUserId();
    const database = db();

    const existing = await database
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, item.productId)));

    if (existing[0]) {
      await database
        .update(cartItems)
        .set({ quantity: existing[0].quantity + 1 })
        .where(eq(cartItems.id, existing[0].id));
    } else {
      await database.insert(cartItems).values({
        userId,
        productId: item.productId,
        title: item.title,
        author: item.author,
        price: String(item.price),
        type: item.type,
        format: item.format,
        coverImage: item.coverImage,
        quantity: item.quantity,
      });
    }

    await upsertCartState(database, userId, { isAbandoned: false });
    return loadCart(userId);
  });

const dbRemoveFromCart = createServerFn({ method: "POST" })
  .validator((productId: string) => productId)
  .handler(async ({ data: productId }): Promise<CartState> => {
    const userId = await getUserId();
    const database = db();
    await database
      .delete(cartItems)
      .where(and(eq(cartItems.userId, userId), eq(cartItems.productId, productId)));
    await upsertCartState(database, userId, {});
    return loadCart(userId);
  });

/** Backs dbClearCart (client path, userId from session). */
async function clearCartRows(userId: string): Promise<CartState> {
  const database = db();
  await database.delete(cartItems).where(eq(cartItems.userId, userId));
  await upsertCartState(database, userId, {
    isAbandoned: false,
    abandonedAt: null,
    recoveryCoupon: null,
    recoveryDiscount: null,
    recoveryOffered: false,
    recoveryRedeemed: false,
  });
  return loadCart(userId);
}

const dbClearCart = createServerFn({ method: "POST" }).handler(
  async (): Promise<CartState> => clearCartRows(await getUserId()),
);

const dbGetCartItemCount = createServerFn({ method: "GET" }).handler(
  async (): Promise<number> => {
    const cart = await loadCart(await getUserId());
    return cart.items.reduce((sum, i) => sum + i.quantity, 0);
  },
);

const dbGetCartTotal = createServerFn({ method: "GET" }).handler(
  async (): Promise<number> => {
    const cart = await loadCart(await getUserId());
    return cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  },
);

const dbRecordActivity = createServerFn({ method: "POST" }).handler(
  async (): Promise<void> => {
    await upsertCartState(db(), await getUserId(), {});
  },
);

const dbCheckAbandoned = createServerFn({ method: "GET" }).handler(
  async (): Promise<boolean> => {
    const cart = await loadCart(await getUserId());
    const elapsed = Date.now() - new Date(cart.lastActivity).getTime();
    return elapsed > IDLE_THRESHOLD_MS;
  },
);

const dbCheckCartAbandoned = createServerFn({ method: "POST" }).handler(
  async (): Promise<CartState> => {
    const userId = await getUserId();
    const cart = await loadCart(userId);
    if (cart.items.length === 0) return cart;

    const elapsed = Date.now() - new Date(cart.lastActivity).getTime();
    const isAbandoned = elapsed > IDLE_THRESHOLD_MS;

    if (isAbandoned && !cart.isAbandoned) {
      await upsertCartState(db(), userId, {
        isAbandoned: true,
        abandonedAt: new Date(),
        recoveryCoupon: RECOVERY_COUPON,
        recoveryDiscount: RECOVERY_DISCOUNT,
        recoveryOffered: true,
      });
      return loadCart(userId);
    }
    return cart;
  },
);

const dbRedeemRecoveryCoupon = createServerFn({ method: "POST" }).handler(
  async (): Promise<CartState> => {
    const userId = await getUserId();
    await upsertCartState(db(), userId, {
      recoveryRedeemed: true,
      isAbandoned: false,
      recoveryOffered: false,
    });
    return loadCart(userId);
  },
);

const dbDismissRecovery = createServerFn({ method: "POST" }).handler(
  async (): Promise<CartState> => {
    const userId = await getUserId();
    await upsertCartState(db(), userId, {
      isAbandoned: false,
      recoveryOffered: false,
    });
    return loadCart(userId);
  },
);

const dbGetRecoveryCouponCode = createServerFn({ method: "GET" }).handler(
  async (): Promise<string | null> => {
    const cart = await loadCart(await getUserId());
    if (cart.recoveryOffered && !cart.recoveryRedeemed && cart.recoveryCoupon) {
      return cart.recoveryCoupon;
    }
    return null;
  },
);

const dbGetRecoveryDiscountPercent = createServerFn({ method: "GET" }).handler(
  async (): Promise<number | null> => {
    const cart = await loadCart(await getUserId());
    if (cart.recoveryOffered && !cart.recoveryRedeemed && cart.recoveryDiscount) {
      return cart.recoveryDiscount;
    }
    return null;
  },
);

const dbGetRecoveryPromoCode = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ code: string; discount: number } | null> => {
    const cart = await loadCart(await getUserId());
    if (cart.recoveryRedeemed && cart.recoveryCoupon && cart.recoveryDiscount) {
      return { code: cart.recoveryCoupon, discount: cart.recoveryDiscount };
    }
    return null;
  },
);

/* ─── Public API ─── */

export async function getCart(): Promise<CartState> {
  return dbGetCart();
}

export async function addToCart(item: Omit<CartItem, "addedAt">): Promise<CartState> {
  return dbAddToCart({ data: item });
}

export async function removeFromCart(productId: string): Promise<CartState> {
  return dbRemoveFromCart({ data: productId });
}

export async function clearCart(): Promise<CartState> {
  return dbClearCart();
}

/**
 * Server-to-server variant of removeFromCart(), for the Stripe webhook
 * (src/routes/api/stripe/webhook.ts) — that request carries no buyer
 * session, so getUserId() can't resolve anything there. userId must come
 * from a trusted source (the checkout session's own metadata, set
 * server-side at session-creation time), never from an untrusted caller.
 * Only removes cart_items rows matching one of the given productIds —
 * deliberately scoped, not a full clear, since a Buy Now checkout only
 * ever charges for one item and must leave the rest of the buyer's
 * persisted cart untouched. Not a createServerFn — never reachable as an
 * RPC endpoint.
 */
export async function removeCartItemsForUser(userId: string, productIds: string[]): Promise<void> {
  if (productIds.length === 0) return;
  const database = db();
  await database
    .delete(cartItems)
    .where(and(eq(cartItems.userId, userId), inArray(cartItems.productId, productIds)));
  await upsertCartState(database, userId, {});
}

export async function getCartItemCount(): Promise<number> {
  return dbGetCartItemCount();
}

export async function getCartTotal(): Promise<number> {
  return dbGetCartTotal();
}

export async function recordActivity(): Promise<void> {
  return dbRecordActivity();
}

export async function checkAbandoned(): Promise<boolean> {
  return dbCheckAbandoned();
}

export async function checkCartAbandoned(): Promise<CartState> {
  return dbCheckCartAbandoned();
}

export async function redeemRecoveryCoupon(): Promise<CartState> {
  return dbRedeemRecoveryCoupon();
}

export async function dismissRecovery(): Promise<CartState> {
  return dbDismissRecovery();
}

export async function getRecoveryCouponCode(): Promise<string | null> {
  return dbGetRecoveryCouponCode();
}

export async function getRecoveryDiscountPercent(): Promise<number | null> {
  return dbGetRecoveryDiscountPercent();
}

// Used by the Promotions bridge: apply the recovery coupon as a global promo override
export async function getRecoveryPromoCode(): Promise<{ code: string; discount: number } | null> {
  return dbGetRecoveryPromoCode();
}
