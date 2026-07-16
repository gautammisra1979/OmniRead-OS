/**
 * Stripe client-side checkout simulation.
 * Generates a simulated checkout session, stores transaction data,
 * and provides a success handler that clears the cart and writes to downloads.
 * All state in localStorage — zero-server architecture.
 */

import { getCart, clearCart, type CartItem } from "~/data/cart";
import { getDownloads, type DownloadRecord } from "~/data/downloads";

export interface StripeTransaction {
  sessionId: string;
  items: CartItem[];
  total: number;
  completedAt: string;
  status: "completed" | "refunded";
}

const TX_KEY = "omnimedia_stripe_transactions";

function generateSessionId(): string {
  return `cs_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function getTransactions(): StripeTransaction[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TX_KEY);
    return raw ? (JSON.parse(raw) as StripeTransaction[]) : [];
  } catch {
    return [];
  }
}

function saveTransactions(txs: StripeTransaction[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(TX_KEY, JSON.stringify(txs));
  }
}

/**
 * Simulate a Stripe Checkout Session redirect.
 * Returns the session ID and stores transaction data.
 */
export function initiateCheckout(): { sessionId: string; redirectUrl: string } {
  const cart = getCart();
  const total = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const sessionId = generateSessionId();

  // Store transaction as pending completion
  const tx: StripeTransaction = {
    sessionId,
    items: [...cart.items],
    total,
    completedAt: new Date().toISOString(),
    status: "completed",
  };
  const txs = getTransactions();
  txs.push(tx);
  saveTransactions(txs);

  return {
    sessionId,
    redirectUrl: `/checkout-success?session_id=${sessionId}`,
  };
}

/**
 * Complete a checkout session: write items to download ledger,
 * clear the cart, and mark transaction as completed.
 * Returns the number of download records added.
 */
export function completeCheckout(sessionId: string): number {
  const txs = getTransactions();
  const tx = txs.find((t) => t.sessionId === sessionId);
  if (!tx) return 0;

  tx.status = "completed";

  // Write each cart item into the download ledger
  const downloads = getDownloads();
  let added = 0;
  for (const item of tx.items) {
    // Avoid duplicates
    const exists = downloads.some(
      (d) => d.productId === item.productId && d.purchasedAt === tx.completedAt
    );
    if (exists) continue;

    const dl: DownloadRecord = {
      id: `dl-${sessionId}-${item.productId}`,
      productId: item.productId,
      productTitle: item.title,
      productAuthor: item.author,
      productType: item.type,
      price: item.price,
      purchasedAt: tx.completedAt,
      lastDownloadedAt: null,
      downloadCount: 0,
    };
    downloads.push(dl);
    added++;
  }

  // Save updated downloads
  if (typeof window !== "undefined") {
    localStorage.setItem("omnimedos_downloads", JSON.stringify(downloads));
  }

  // Clear the cart
  clearCart();

  // Update transaction
  saveTransactions(txs);

  return added;
}

/**
 * Flag a transaction and its download records as refunded.
 */
export function markTransactionRefunded(sessionId: string): void {
  const txs = getTransactions();
  const tx = txs.find((t) => t.sessionId === sessionId);
  if (tx) {
    tx.status = "refunded";
    saveTransactions(txs);
  }

  // Also mark download ledger entries as refunded
  const downloads = getDownloads();
  let changed = false;
  for (const dl of downloads) {
    if (dl.purchasedAt === tx?.completedAt) {
      (dl as any).status = "Refunded";
      changed = true;
    }
  }
  if (changed) {
    if (typeof window !== "undefined") {
      localStorage.setItem("omnimedos_downloads", JSON.stringify(downloads));
    }
  }
}
