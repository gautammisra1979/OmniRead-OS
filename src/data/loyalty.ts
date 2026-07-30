import { createServerFn } from "@tanstack/react-start";
import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "~/db";
import {
  loyaltyConfig,
  loyaltyLedger,
  type LoyaltyConfigRow,
  type LoyaltyLedgerRow,
} from "~/db/schema";
import { getOrCreateOwnerId } from "~/lib/ownerId";
import { requireAdmin } from "~/lib/requireAdmin";

/**
 * Phase 3 (Step 26): DB-backed loyalty config + ledger, replacing the
 * localStorage version. `loyalty_config` holds both draft and published rows
 * per owner, differentiated by the `status` column. Rows are keyed by the
 * anonymous ownerId cookie (src/lib/ownerId.ts) rather than a real user_id —
 * swap once Better Auth lands. The one Flight Recorder call that used to
 * fire on every ledger mutation has been removed; Postgres is the
 * durability layer now.
 *
 * NOTE (flagged for review): getCurrentTier, getNextTier, and
 * calculateEarnedPoints used to fetch their own points/config from
 * localStorage internally. Now that those reads hit the DB and are async,
 * these three stay synchronous pure functions but now take `points` (and,
 * for calculateEarnedPoints, `tier`) as explicit parameters instead of
 * fetching internally — callers must fetch points/tier themselves first.
 * ProgressHub.tsx was updated for the new getCurrentTier/getNextTier
 * signature; calculateEarnedPoints has no call sites elsewhere in the repo
 * today, so its new required `tier` param has no other call sites to fix.
 */

export interface LoyaltyTier {
  name: string;
  pointsRequired: number;
  multiplier: number;
}

export interface LoyaltyConfig {
  tiers: LoyaltyTier[];
  pointsPerPurchase: number;
  extraCreditsMultiplier: number;
  conversionRate: number;
  minimumRedeem: number;
}

export interface LoyaltyLedgerEntry {
  id: string;
  type: "earned" | "redeemed" | "bonus";
  points: number;
  description: string;
  timestamp: string;
  productId?: string;
}

const DEFAULT_CONFIG: LoyaltyConfig = {
  tiers: [
    { name: "Bronze", pointsRequired: 0, multiplier: 1 },
    { name: "Silver", pointsRequired: 100, multiplier: 1.5 },
    { name: "Gold", pointsRequired: 300, multiplier: 2 },
    { name: "Platinum", pointsRequired: 600, multiplier: 3 },
  ],
  pointsPerPurchase: 10,
  extraCreditsMultiplier: 1,
  conversionRate: 100,
  minimumRedeem: 50,
};

function db() {
  return drizzle(sql());
}

function rowToConfig(row: LoyaltyConfigRow): LoyaltyConfig {
  return {
    tiers: row.tiers as LoyaltyTier[],
    pointsPerPurchase: row.pointsPerPurchase,
    extraCreditsMultiplier: Number(row.extraCreditsMultiplier),
    conversionRate: row.conversionRate,
    minimumRedeem: row.minimumRedeem,
  };
}

function rowToLedgerEntry(row: LoyaltyLedgerRow): LoyaltyLedgerEntry {
  return {
    id: row.id,
    type: row.type as LoyaltyLedgerEntry["type"],
    points: row.points,
    description: row.description,
    timestamp: row.timestamp.toISOString(),
    productId: row.productId ?? undefined,
  };
}

async function upsertConfig(
  ownerId: string,
  status: "draft" | "published",
  config: LoyaltyConfig,
): Promise<void> {
  const values = {
    ownerId,
    status,
    tiers: config.tiers,
    pointsPerPurchase: config.pointsPerPurchase,
    extraCreditsMultiplier: String(config.extraCreditsMultiplier),
    conversionRate: config.conversionRate,
    minimumRedeem: config.minimumRedeem,
  };
  await db()
    .insert(loyaltyConfig)
    .values(values)
    .onConflictDoUpdate({
      target: [loyaltyConfig.ownerId, loyaltyConfig.status],
      set: values,
    });
}

/* ─── Internal server functions: Draft / Published Config ─── */

const dbGetConfig = createServerFn({ method: "GET" })
  .validator((status: "draft" | "published") => status)
  .handler(async ({ data: status }): Promise<LoyaltyConfig> => {
    const ownerId = getOrCreateOwnerId();
    const rows = await db()
      .select()
      .from(loyaltyConfig)
      .where(and(eq(loyaltyConfig.ownerId, ownerId), eq(loyaltyConfig.status, status)));
    return rows[0] ? rowToConfig(rows[0]) : structuredClone(DEFAULT_CONFIG);
  });

const dbSaveDraftConfig = createServerFn({ method: "POST" })
  .validator((config: LoyaltyConfig) => config)
  .handler(async ({ data: config }): Promise<void> => {
    await requireAdmin();
    await upsertConfig(getOrCreateOwnerId(), "draft", config);
  });

const dbPublishConfig = createServerFn({ method: "POST" })
  .validator((config: LoyaltyConfig) => config)
  .handler(async ({ data: config }): Promise<void> => {
    await requireAdmin();
    await upsertConfig(getOrCreateOwnerId(), "published", config);
  });

const dbHasPublishedConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<boolean> => {
    const ownerId = getOrCreateOwnerId();
    const rows = await db()
      .select()
      .from(loyaltyConfig)
      .where(and(eq(loyaltyConfig.ownerId, ownerId), eq(loyaltyConfig.status, "published")));
    return rows.length > 0;
  },
);

/* ─── Internal server functions: Ledger ─── */

const dbGetLedger = createServerFn({ method: "GET" }).handler(
  async (): Promise<LoyaltyLedgerEntry[]> => {
    const ownerId = getOrCreateOwnerId();
    const rows = await db()
      .select()
      .from(loyaltyLedger)
      .where(eq(loyaltyLedger.ownerId, ownerId))
      .orderBy(desc(loyaltyLedger.timestamp));
    return rows.map(rowToLedgerEntry);
  },
);

const dbSaveLedger = createServerFn({ method: "POST" })
  .validator((entries: LoyaltyLedgerEntry[]) => entries)
  .handler(async ({ data: entries }): Promise<void> => {
    const ownerId = getOrCreateOwnerId();
    const database = db();
    await database.delete(loyaltyLedger).where(eq(loyaltyLedger.ownerId, ownerId));
    if (entries.length === 0) return;
    await database.insert(loyaltyLedger).values(
      entries.map((entry) => ({
        ownerId,
        type: entry.type,
        points: entry.points,
        description: entry.description,
        productId: entry.productId ?? null,
      })),
    );
  });

const dbAddLedgerEntry = createServerFn({ method: "POST" })
  .validator((entry: Omit<LoyaltyLedgerEntry, "id" | "timestamp">) => entry)
  .handler(async ({ data: entry }): Promise<LoyaltyLedgerEntry> => {
    const ownerId = getOrCreateOwnerId();
    const [row] = await db()
      .insert(loyaltyLedger)
      .values({
        ownerId,
        type: entry.type,
        points: entry.points,
        description: entry.description,
        productId: entry.productId ?? null,
      })
      .returning();
    return rowToLedgerEntry(row);
  });

const dbGetCurrentPoints = createServerFn({ method: "GET" }).handler(
  async (): Promise<number> => {
    const ownerId = getOrCreateOwnerId();
    const rows = await db()
      .select()
      .from(loyaltyLedger)
      .where(eq(loyaltyLedger.ownerId, ownerId));
    return rows.reduce((sum, entry) => {
      if (entry.type === "earned" || entry.type === "bonus") return sum + entry.points;
      if (entry.type === "redeemed") return sum - entry.points;
      return sum;
    }, 0);
  },
);

/* ─── Public API: Draft / Published Config ─── */

export async function getDraftConfig(): Promise<LoyaltyConfig> {
  return dbGetConfig({ data: "draft" });
}

export async function saveDraftConfig(config: LoyaltyConfig): Promise<void> {
  return dbSaveDraftConfig({ data: config });
}

export async function getPublishedConfig(): Promise<LoyaltyConfig> {
  return dbGetConfig({ data: "published" });
}

export async function publishConfig(config: LoyaltyConfig): Promise<void> {
  return dbPublishConfig({ data: config });
}

export async function hasPublishedConfig(): Promise<boolean> {
  return dbHasPublishedConfig();
}

/* ─── Public API: Ledger ─── */

export async function getLedger(): Promise<LoyaltyLedgerEntry[]> {
  return dbGetLedger();
}

export async function saveLedger(entries: LoyaltyLedgerEntry[]): Promise<void> {
  return dbSaveLedger({ data: entries });
}

export async function addLedgerEntry(
  entry: Omit<LoyaltyLedgerEntry, "id" | "timestamp">,
): Promise<LoyaltyLedgerEntry> {
  return dbAddLedgerEntry({ data: entry });
}

/* ─── Points Calculations ─── */

export async function getCurrentPoints(): Promise<number> {
  return dbGetCurrentPoints();
}

/** Pure — takes `points` explicitly instead of fetching it internally (see
 *  note at top of file). */
export function getCurrentTier(config: LoyaltyConfig, points: number): LoyaltyTier {
  const sorted = [...config.tiers].sort((a, b) => b.pointsRequired - a.pointsRequired);
  for (const tier of sorted) {
    if (points >= tier.pointsRequired) return tier;
  }
  return config.tiers[0];
}

/** Pure — takes `points` explicitly instead of fetching it internally (see
 *  note at top of file). */
export function getNextTier(
  config: LoyaltyConfig,
  points: number,
): { next: LoyaltyTier | null; pointsNeeded: number; progressPercent: number } {
  const sorted = [...config.tiers].sort((a, b) => a.pointsRequired - b.pointsRequired);
  const highest = sorted[sorted.length - 1];

  if (points >= highest.pointsRequired) {
    return { next: null, pointsNeeded: 0, progressPercent: 100 };
  }

  for (let i = 0; i < sorted.length; i++) {
    if (points < sorted[i].pointsRequired) {
      const prevThreshold = i > 0 ? sorted[i - 1].pointsRequired : 0;
      const range = sorted[i].pointsRequired - prevThreshold;
      const progress = points - prevThreshold;
      return { next: sorted[i], pointsNeeded: sorted[i].pointsRequired - points, progressPercent: Math.round((progress / range) * 100) };
    }
  }

  return { next: null, pointsNeeded: 0, progressPercent: 100 };
}

/** Pure — takes `tier` explicitly instead of fetching it internally (see
 *  note at top of file). No call sites elsewhere in the repo today. */
export function calculateEarnedPoints(basePoints: number, config: LoyaltyConfig, tier: LoyaltyTier): number {
  return Math.round(basePoints * config.extraCreditsMultiplier * tier.multiplier);
}

export async function redeemPoints(points: number, description: string): Promise<boolean> {
  const [balance, config] = await Promise.all([getCurrentPoints(), getPublishedConfig()]);
  if (points < config.minimumRedeem) return false;
  if (points > balance) return false;
  await addLedgerEntry({ type: "redeemed", points, description });
  return true;
}

export function getEstimatedDollarValue(points: number, config: LoyaltyConfig): number {
  return points / config.conversionRate;
}
