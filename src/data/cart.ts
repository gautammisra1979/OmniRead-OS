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

const STORAGE_KEY = "omnimedia_cart";
const ACTIVITY_KEY = "omnimedia_last_activity";
const IDLE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes
const RECOVERY_COUPON = "WELCOME_BACK";
const RECOVERY_DISCOUNT = 15; // 15% off

function getDefaultCart(): CartState {
  return {
    items: [],
    lastActivity: new Date().toISOString(),
    isAbandoned: false,
    abandonedAt: null,
    recoveryCoupon: null,
    recoveryDiscount: null,
    recoveryOffered: false,
    recoveryRedeemed: false,
  };
}

export function getCart(): CartState {
  if (typeof window === "undefined") return getDefaultCart();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...getDefaultCart(), ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return getDefaultCart();
}

function saveCart(cart: CartState): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cart));
  }
}

export function addToCart(item: Omit<CartItem, "addedAt">): CartState {
  const cart = getCart();
  const existing = cart.items.find((i) => i.productId === item.productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    cart.items.push({ ...item, addedAt: new Date().toISOString() });
  }
  cart.lastActivity = new Date().toISOString();
  cart.isAbandoned = false;
  saveCart(cart);
  // Flight Recorder
  import("./flightRecorder").then(({ appendTransaction }) =>
    appendTransaction("CART_UPDATE", cart),
  );
  return cart;
}

export function removeFromCart(productId: string): CartState {
  const cart = getCart();
  cart.items = cart.items.filter((i) => i.productId !== productId);
  cart.lastActivity = new Date().toISOString();
  saveCart(cart);
  // Flight Recorder
  import("./flightRecorder").then(({ appendTransaction }) =>
    appendTransaction("CART_UPDATE", cart),
  );
  return cart;
}

export function clearCart(): CartState {
  const cart = getDefaultCart();
  saveCart(cart);
  // Flight Recorder
  import("./flightRecorder").then(({ appendTransaction }) =>
    appendTransaction("CART_UPDATE", cart),
  );
  return cart;
}

export function getCartItemCount(): number {
  const cart = getCart();
  return cart.items.reduce((sum, i) => sum + i.quantity, 0);
}

export function getCartTotal(): number {
  const cart = getCart();
  return cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

// --- Idle / Activity Tracking ---

export function recordActivity(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVITY_KEY, new Date().toISOString());
  // Also update cart's lastActivity
  const cart = getCart();
  cart.lastActivity = new Date().toISOString();
  saveCart(cart);
}

function getLastActivity(): Date | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ACTIVITY_KEY);
    if (raw) return new Date(raw);
  } catch {
    /* ignore */
  }
  return null;
}

export function checkAbandoned(): boolean {
  const last = getLastActivity();
  if (!last) return false;
  const elapsed = Date.now() - last.getTime();
  return elapsed > IDLE_THRESHOLD_MS;
}

export function checkCartAbandoned(): CartState {
  const cart = getCart();
  if (cart.items.length === 0) return cart;
  if (checkAbandoned() && !cart.isAbandoned) {
    cart.isAbandoned = true;
    cart.abandonedAt = new Date().toISOString();
    // Generate recovery incentive
    cart.recoveryCoupon = RECOVERY_COUPON;
    cart.recoveryDiscount = RECOVERY_DISCOUNT;
    cart.recoveryOffered = true;
    saveCart(cart);
  }
  return cart;
}

export function redeemRecoveryCoupon(): CartState {
  const cart = getCart();
  cart.recoveryRedeemed = true;
  cart.isAbandoned = false;
  cart.recoveryOffered = false;
  saveCart(cart);
  return cart;
}

export function dismissRecovery(): CartState {
  const cart = getCart();
  cart.isAbandoned = false;
  cart.recoveryOffered = false;
  saveCart(cart);
  return cart;
}

export function getRecoveryCouponCode(): string | null {
  const cart = getCart();
  if (cart.recoveryOffered && !cart.recoveryRedeemed && cart.recoveryCoupon) {
    return cart.recoveryCoupon;
  }
  return null;
}

export function getRecoveryDiscountPercent(): number | null {
  const cart = getCart();
  if (cart.recoveryOffered && !cart.recoveryRedeemed && cart.recoveryDiscount) {
    return cart.recoveryDiscount;
  }
  return null;
}

// Used by the Promotions bridge: apply the recovery coupon as a global promo override
export function getRecoveryPromoCode(): { code: string; discount: number } | null {
  const cart = getCart();
  if (cart.recoveryRedeemed && cart.recoveryCoupon && cart.recoveryDiscount) {
    return { code: cart.recoveryCoupon, discount: cart.recoveryDiscount };
  }
  return null;
}