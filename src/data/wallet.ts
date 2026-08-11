// Credit Wallet & Token Engine

import { createServerFn } from "@tanstack/react-start";
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "~/db";
import { wallet as walletTable, type WalletRow } from "~/db/schema";
import { getUserId } from "~/lib/getUserId";
import { requireAdmin } from "~/lib/requireAdmin";

/**
 * Phase 3 (Step 26): DB-backed wallet, replacing the localStorage version.
 * costPer1K is folded into the same `wallet` row as a column (no more
 * separate COST_KEY). Rows are keyed by the Better Auth user_id
 * (src/lib/getUserId.ts) — every visitor, guest or logged-in, has one via
 * the `anonymous` plugin. Flight Recorder calls that used to fire on every
 * mutation here have been removed; Postgres is the durability layer now.
 *
 * Each public function below is a plain async wrapper around an internal
 * createServerFn, preserving the original call signature. The
 * `wallet-updated` CustomEvent still fires from these wrappers (client-side
 * only) after a successful write, since the DB write itself happens on the
 * server and has no `window` to dispatch from.
 */

export interface WalletState {
  credits: number;
  totalPurchased: number;
  totalConsumed: number;
  refillPrice: number;
}

const DEFAULT_WALLET: WalletState = {
  credits: 50,
  totalPurchased: 50,
  totalConsumed: 0,
  refillPrice: 3.99,
};

const DEFAULT_COST_PER_1K = 0.01;

function db() {
  return drizzle(sql());
}

function rowToWalletState(row: WalletRow): WalletState {
  return {
    credits: Number(row.credits),
    totalPurchased: Number(row.totalPurchased),
    totalConsumed: Number(row.totalConsumed),
    refillPrice: Number(row.refillPrice),
  };
}

async function loadWalletRow(userId: string): Promise<WalletRow | null> {
  const rows = await db().select().from(walletTable).where(eq(walletTable.userId, userId));
  return rows[0] ?? null;
}

/** Upsert the wallet row: creates it with defaults (overridden by `patch`) if
 *  missing, or applies `patch` on top of the existing row. */
async function upsertWallet(
  userId: string,
  patch: Partial<{
    credits: string;
    totalPurchased: string;
    totalConsumed: string;
    refillPrice: string;
    costPer1K: string;
  }>,
): Promise<WalletRow> {
  const [row] = await db()
    .insert(walletTable)
    .values({
      userId,
      credits: patch.credits ?? String(DEFAULT_WALLET.credits),
      totalPurchased: patch.totalPurchased ?? String(DEFAULT_WALLET.totalPurchased),
      totalConsumed: patch.totalConsumed ?? String(DEFAULT_WALLET.totalConsumed),
      refillPrice: patch.refillPrice ?? String(DEFAULT_WALLET.refillPrice),
      costPer1K: patch.costPer1K ?? String(DEFAULT_COST_PER_1K),
    })
    .onConflictDoUpdate({
      target: walletTable.userId,
      set: patch,
    })
    .returning();
  return row;
}

/* ─── Internal server functions ─── */

const dbGetWallet = createServerFn({ method: "GET" }).handler(
  async (): Promise<WalletState> => {
    const row = await loadWalletRow(await getUserId());
    return row ? rowToWalletState(row) : { ...DEFAULT_WALLET };
  },
);

const dbSaveWallet = createServerFn({ method: "POST" })
  .validator((state: WalletState) => state)
  .handler(async ({ data: state }): Promise<void> => {
    await upsertWallet(await getUserId(), {
      credits: String(state.credits),
      totalPurchased: String(state.totalPurchased),
      totalConsumed: String(state.totalConsumed),
      refillPrice: String(state.refillPrice),
    });
  });

const dbDeductCredits = createServerFn({ method: "POST" })
  .validator((amount: number) => amount)
  .handler(async ({ data: amount }): Promise<{ ok: boolean; wallet: WalletState }> => {
    const userId = await getUserId();
    const row = await loadWalletRow(userId);
    const current = row ? rowToWalletState(row) : { ...DEFAULT_WALLET };
    if (current.credits < amount) {
      return { ok: false, wallet: current };
    }
    const next: WalletState = {
      ...current,
      credits: current.credits - amount,
      totalConsumed: current.totalConsumed + amount,
    };
    await upsertWallet(userId, {
      credits: String(next.credits),
      totalPurchased: String(next.totalPurchased),
      totalConsumed: String(next.totalConsumed),
      refillPrice: String(next.refillPrice),
    });
    return { ok: true, wallet: next };
  });

const dbAddCredits = createServerFn({ method: "POST" })
  .validator((amount: number) => amount)
  .handler(async ({ data: amount }): Promise<WalletState> => {
    const userId = await getUserId();
    const row = await loadWalletRow(userId);
    const current = row ? rowToWalletState(row) : { ...DEFAULT_WALLET };
    const next: WalletState = {
      ...current,
      credits: current.credits + amount,
      totalPurchased: current.totalPurchased + amount,
    };
    await upsertWallet(userId, {
      credits: String(next.credits),
      totalPurchased: String(next.totalPurchased),
      totalConsumed: String(next.totalConsumed),
      refillPrice: String(next.refillPrice),
    });
    return next;
  });

const dbGetCostPer1K = createServerFn({ method: "GET" }).handler(
  async (): Promise<number> => {
    const row = await loadWalletRow(await getUserId());
    return row ? Number(row.costPer1K) : DEFAULT_COST_PER_1K;
  },
);

const dbSaveCostPer1K = createServerFn({ method: "POST" })
  .validator((cost: number) => cost)
  .handler(async ({ data: cost }): Promise<void> => {
    await requireAdmin();
    const clamped = Math.min(0.05, Math.max(0, cost));
    await upsertWallet(await getUserId(), { costPer1K: String(clamped) });
  });

/* ─── Public API ─── */

export async function getWallet(): Promise<WalletState> {
  return dbGetWallet();
}

export async function saveWallet(state: WalletState): Promise<void> {
  await dbSaveWallet({ data: state });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("wallet-updated", { detail: state }));
  }
}

export async function deductCredits(amount: number): Promise<boolean> {
  const result = await dbDeductCredits({ data: amount });
  if (result.ok && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("wallet-updated", { detail: result.wallet }));
  }
  return result.ok;
}

export async function addCredits(amount: number): Promise<void> {
  const wallet = await dbAddCredits({ data: amount });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("wallet-updated", { detail: wallet }));
  }
}

export function calculateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function estimateCost(tokens: number, costPer1K: number): number {
  return (tokens / 1000) * costPer1K;
}

export async function getCostPer1K(): Promise<number> {
  return dbGetCostPer1K();
}

export async function saveCostPer1K(cost: number): Promise<void> {
  return dbSaveCostPer1K({ data: cost });
}
