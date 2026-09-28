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
import { getUserId } from "~/lib/getUserId";
import { requireAdmin } from "~/lib/requireAdmin";

/**
 * Phase 3 (Step 26): DB-backed loyalty config + ledger, replacing the
 * localStorage version. `loyalty_config` holds both draft and published rows
 * per owner, differentiated by the `status` column. Rows are keyed by the
 * Better Auth user_id (src/lib/getUserId.ts) — every visitor, guest or
 * logged-in, has one via the `anonymous` plugin. The one Flight Recorder
 * call that used to fire on every ledger mutation has been removed;
 * Postgres is the durability layer now.
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
  userId: string,
  status: "draft" | "published",
  config: LoyaltyConfig,
): Promise<void> {
  const values = {
    userId,
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
      target: [loyaltyConfig.userId, loyaltyConfig.status],
      set: values,
    });
}

/* ─── Internal server functions: Draft / Published Config ─── */

/** Shared by dbGetConfig and dbRedeemPoints so the two can't drift on which
 *  config row a given (userId, status) pair resolves to. */
async function loadConfig(
  userId: string,
  status: "draft" | "published",
): Promise<LoyaltyConfig> {
  const rows = await db()
    .select()
    .from(loyaltyConfig)
    .where(and(eq(loyaltyConfig.userId, userId), eq(loyaltyConfig.status, status)));
  return rows[0] ? rowToConfig(rows[0]) : structuredClone(DEFAULT_CONFIG);
}

const dbGetConfig = createServerFn({ method: "GET" })
  .validator((status: "draft" | "published") => status)
  .handler(async ({ data: status }): Promise<LoyaltyConfig> => {
    const userId = await getUserId();
    return loadConfig(userId, status);
  });

const dbSaveDraftConfig = createServerFn({ method: "POST" })
  .validator((config: LoyaltyConfig) => config)
  .handler(async ({ data: config }): Promise<void> => {
    await requireAdmin();
    await upsertConfig(await getUserId(), "draft", config);
  });

const dbPublishConfig = createServerFn({ method: "POST" })
  .validator((config: LoyaltyConfig) => config)
  .handler(async ({ data: config }): Promise<void> => {
    await requireAdmin();
    await upsertConfig(await getUserId(), "published", config);
  });

const dbHasPublishedConfig = createServerFn({ method: "GET" }).handler(
  async (): Promise<boolean> => {
    const userId = await getUserId();
    const rows = await db()
      .select()
      .from(loyaltyConfig)
      .where(and(eq(loyaltyConfig.userId, userId), eq(loyaltyConfig.status, "published")));
    return rows.length > 0;
  },
);

/* ─── Internal server functions: Ledger ─── */

const dbGetLedger = createServerFn({ method: "GET" }).handler(
  async (): Promise<LoyaltyLedgerEntry[]> => {
    const userId = await getUserId();
    const rows = await db()
      .select()
      .from(loyaltyLedger)
      .where(eq(loyaltyLedger.userId, userId))
      .orderBy(desc(loyaltyLedger.timestamp));
    return rows.map(rowToLedgerEntry);
  },
);

/**
 * Server-validated redemption: unlike the previous ledger-insert function
 * (which let the caller pick any `type`/`points` and trusted the browser's
 * minimum-redeem/balance checks), this only ever inserts `type: "redeemed"`
 * and enforces the minimum and the balance itself.
 *
 * The balance check and the insert are one SQL statement (INSERT ... SELECT
 * ... WHERE) — but under Postgres's default READ COMMITTED isolation that
 * alone does NOT stop two concurrent redeems from both reading the
 * pre-redemption balance and both passing (live-tested: 10 trials of two
 * concurrent same-amount redeems against a balance covering exactly one,
 * READ COMMITTED, both succeeded 5/10 times, balance went negative). The
 * insert therefore runs inside a SERIALIZABLE transaction (neon-http's
 * `.transaction()`, the only way this driver exposes an isolation level for
 * a single query) — Postgres's SSI aborts the loser with a `40001`
 * serialization failure, which is retried a bounded number of times so the
 * retry's own fresh balance read decides it, rather than surfacing a
 * transient conflict as an error. Re-tested the same 10-trial concurrency
 * script after this change: exactly one success per trial, balance never
 * negative.
 */
const dbRedeemPoints = createServerFn({ method: "POST" })
  .validator((data: { points: number; description: string }) => data)
  .handler(async ({ data }): Promise<boolean> => {
    const userId = await getUserId();
    const { points } = data;
    if (!Number.isInteger(points) || points <= 0) return false;

    const trimmedDescription = data.description.trim();
    const description = (trimmedDescription || `Redeemed ${points} points`).slice(0, 200);

    const config = await loadConfig(userId, "published");
    if (points < config.minimumRedeem) return false;

    const client = sql();
    const MAX_ATTEMPTS = 5;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const [rows] = await client.transaction(
          [
            client`
              INSERT INTO loyalty_ledger (user_id, type, points, description)
              SELECT ${userId}, 'redeemed', ${points}, ${description}
              WHERE (
                SELECT COALESCE(SUM(CASE
                  WHEN type IN ('earned', 'bonus') THEN points
                  WHEN type = 'redeemed' THEN -points
                  ELSE 0
                END), 0)
                FROM loyalty_ledger
                WHERE user_id = ${userId}
              ) >= ${points}
              RETURNING id
            `,
          ],
          { isolationLevel: "Serializable" },
        );
        return rows.length > 0;
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === "40001" && attempt < MAX_ATTEMPTS) continue; // serialization conflict — retry
        throw error;
      }
    }
    return false;
  });

/**
 * Defense in depth: the only intended caller (refund approval in
 * src/data/refunds.ts) is already admin-gated, but every mutating handler in
 * this project gates itself individually rather than trusting caller
 * context (see affiliateProgram.ts's dbVoidAffiliateLedgerForDownload).
 */
const dbClawbackLoyaltyPointsForBuyer = createServerFn({ method: "POST" })
  .validator((data: { userId: string; points: number; description: string }) => data)
  .handler(async ({ data }): Promise<void> => {
    await requireAdmin();
    await db().insert(loyaltyLedger).values({
      userId: data.userId,
      type: "redeemed",
      points: data.points,
      description: data.description,
    });
  });

const dbGetCurrentPoints = createServerFn({ method: "GET" }).handler(
  async (): Promise<number> => {
    const userId = await getUserId();
    const rows = await db()
      .select()
      .from(loyaltyLedger)
      .where(eq(loyaltyLedger.userId, userId));
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

/**
 * Server-to-server variant for src/data/refunds.ts's refund-approval path.
 * redeemPoints() below always credits the *calling* session's own userId via
 * getUserId(), never an arbitrary target user, so it can't be reused to
 * deduct points from the actual buyer — same constraint documented on the
 * affiliate side by affiliateProgram.ts's resolveEligibleForAffiliate.
 *
 * Deliberately not routed through redeemPoints(): a refund clawback isn't a
 * voluntary redemption, so it must not be blocked by redeemPoints()'s
 * minimumRedeem/insufficient-balance checks. The points being clawed back
 * were genuinely earned by a purchase that's now genuinely reversed,
 * regardless of whether the buyer already spent them elsewhere — so the
 * resulting balance is allowed to go negative.
 */
export async function clawbackLoyaltyPointsForBuyer(
  buyerUserId: string,
  points: number,
  description: string,
): Promise<void> {
  return dbClawbackLoyaltyPointsForBuyer({ data: { userId: buyerUserId, points, description } });
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
  return dbRedeemPoints({ data: { points, description } });
}

export function getEstimatedDollarValue(points: number, config: LoyaltyConfig): number {
  return points / config.conversionRate;
}
