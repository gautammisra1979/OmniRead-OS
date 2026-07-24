import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "~/db";
import { cartItems, cartState, type CartItemRow, type CartStateRow } from "~/db/schema";
import { getOrCreateOwnerId } from "~/lib/ownerId";

/**
 * Phase 3 (Step 26): DB-backed cart, replacing the localStorage version.
 * Rows are keyed by the anonymous ownerId cookie (src/lib/ownerId.ts) rather
 * than a real user_id — swap once Better Auth lands. Flight Recorder calls
 * that used to fire on every mutation here have been removed; Postgres is
 * the durability layer now, and its replacement audit trail is a separate
 * future task.
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

async function loadCart(ownerId: string): Promise<CartState> {
  const database = db();
  const [items, stateRows] = await Promise.all([
    database.select().from(cartItems).where(eq(cartItems.ownerId, ownerId)),
    database.select().from(cartState).where(eq(cartState.ownerId, ownerId)),
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
  ownerId: string,
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
      ownerId,
      lastActivity: now,
      isAbandoned: patch.isAbandoned ?? false,
      abandonedAt: patch.abandonedAt ?? null,
      recoveryCoupon: patch.recoveryCoupon ?? null,
      recoveryDiscount: patch.recoveryDiscount ?? null,
      recoveryOffered: patch.recoveryOffered ?? false,
      recoveryRedeemed: patch.recoveryRedeemed ?? false,
    })
    .onConflictDoUpdate({
      target: cartState.ownerId,
      set: { lastActivity: now, ...patch },
    });
}

/* ─── Internal server functions ─── */

const dbGetCart = createServerFn({ method: "GET" }).handler(
  async (): Promise<CartState> => loadCart(getOrCreateOwnerId()),
);

const dbAddToCart = createServerFn({ method: "POST" })
  .validator((item: Omit<CartItem, "addedAt">) => item)
  .handler(async ({ data: item }): Promise<CartState> => {
    const ownerId = getOrCreateOwnerId();
    const database = db();

    const existing = await database
      .select()
      .from(cartItems)
      .where(and(eq(cartItems.ownerId, ownerId), eq(cartItems.productId, item.productId)));

    if (existing[0]) {
      await database
        .update(cartItems)
        .set({ quantity: existing[0].quantity + 1 })
        .where(eq(cartItems.id, existing[0].id));
    } else {
      await database.insert(cartItems).values({
        ownerId,
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

    await upsertCartState(database, ownerId, { isAbandoned: false });
    return loadCart(ownerId);
  });

const dbRemoveFromCart = createServerFn({ method: "POST" })
  .validator((productId: string) => productId)
  .handler(async ({ data: productId }): Promise<CartState> => {
    const ownerId = getOrCreateOwnerId();
    const database = db();
    await database
      .delete(cartItems)
      .where(and(eq(cartItems.ownerId, ownerId), eq(cartItems.productId, productId)));
    await upsertCartState(database, ownerId, {});
    return loadCart(ownerId);
  });

const dbClearCart = createServerFn({ method: "POST" }).handler(
  async (): Promise<CartState> => {
    const ownerId = getOrCreateOwnerId();
    const database = db();
    await database.delete(cartItems).where(eq(cartItems.ownerId, ownerId));
    await upsertCartState(database, ownerId, {
      isAbandoned: false,
      abandonedAt: null,
      recoveryCoupon: null,
      recoveryDiscount: null,
      recoveryOffered: false,
      recoveryRedeemed: false,
    });
    return loadCart(ownerId);
  },
);

const dbGetCartItemCount = createServerFn({ method: "GET" }).handler(
  async (): Promise<number> => {
    const cart = await loadCart(getOrCreateOwnerId());
    return cart.items.reduce((sum, i) => sum + i.quantity, 0);
  },
);

const dbGetCartTotal = createServerFn({ method: "GET" }).handler(
  async (): Promise<number> => {
    const cart = await loadCart(getOrCreateOwnerId());
    return cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  },
);

const dbRecordActivity = createServerFn({ method: "POST" }).handler(
  async (): Promise<void> => {
    await upsertCartState(db(), getOrCreateOwnerId(), {});
  },
);

const dbCheckAbandoned = createServerFn({ method: "GET" }).handler(
  async (): Promise<boolean> => {
    const cart = await loadCart(getOrCreateOwnerId());
    const elapsed = Date.now() - new Date(cart.lastActivity).getTime();
    return elapsed > IDLE_THRESHOLD_MS;
  },
);

const dbCheckCartAbandoned = createServerFn({ method: "POST" }).handler(
  async (): Promise<CartState> => {
    const ownerId = getOrCreateOwnerId();
    const cart = await loadCart(ownerId);
    if (cart.items.length === 0) return cart;

    const elapsed = Date.now() - new Date(cart.lastActivity).getTime();
    const isAbandoned = elapsed > IDLE_THRESHOLD_MS;

    if (isAbandoned && !cart.isAbandoned) {
      await upsertCartState(db(), ownerId, {
        isAbandoned: true,
        abandonedAt: new Date(),
        recoveryCoupon: RECOVERY_COUPON,
        recoveryDiscount: RECOVERY_DISCOUNT,
        recoveryOffered: true,
      });
      return loadCart(ownerId);
    }
    return cart;
  },
);

const dbRedeemRecoveryCoupon = createServerFn({ method: "POST" }).handler(
  async (): Promise<CartState> => {
    const ownerId = getOrCreateOwnerId();
    await upsertCartState(db(), ownerId, {
      recoveryRedeemed: true,
      isAbandoned: false,
      recoveryOffered: false,
    });
    return loadCart(ownerId);
  },
);

const dbDismissRecovery = createServerFn({ method: "POST" }).handler(
  async (): Promise<CartState> => {
    const ownerId = getOrCreateOwnerId();
    await upsertCartState(db(), ownerId, {
      isAbandoned: false,
      recoveryOffered: false,
    });
    return loadCart(ownerId);
  },
);

const dbGetRecoveryCouponCode = createServerFn({ method: "GET" }).handler(
  async (): Promise<string | null> => {
    const cart = await loadCart(getOrCreateOwnerId());
    if (cart.recoveryOffered && !cart.recoveryRedeemed && cart.recoveryCoupon) {
      return cart.recoveryCoupon;
    }
    return null;
  },
);

const dbGetRecoveryDiscountPercent = createServerFn({ method: "GET" }).handler(
  async (): Promise<number | null> => {
    const cart = await loadCart(getOrCreateOwnerId());
    if (cart.recoveryOffered && !cart.recoveryRedeemed && cart.recoveryDiscount) {
      return cart.recoveryDiscount;
    }
    return null;
  },
);

const dbGetRecoveryPromoCode = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ code: string; discount: number } | null> => {
    const cart = await loadCart(getOrCreateOwnerId());
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
