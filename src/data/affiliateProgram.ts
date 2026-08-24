import { createServerFn } from "@tanstack/react-start";
import { and, eq, inArray, lt, sql as dsql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "~/db";
import {
  affiliateProfiles,
  affiliateReferrals,
  affiliateClickEvents,
  affiliateLedger,
  affiliatePayouts,
  loyaltyConfig,
  loyaltyLedger,
  type AffiliateProfileRow,
  type AffiliateLedgerRow,
} from "~/db/schema";
import { getUserId } from "~/lib/getUserId";
import { requireAdmin } from "~/lib/requireAdmin";
import { getAffiliateSettings, type AffiliateSettings } from "~/data/affiliateSettings";

/**
 * Tier A: the real affiliate backend. Replaces the pieces of the localStorage
 * model (src/data/affiliate.ts) that have no server-side equivalent —
 * referral capture, commission crediting, refund voiding, and payout
 * settlement. src/data/affiliate.ts itself and its UI consumers are
 * untouched; nothing here is wired into them yet (Tier B).
 *
 * Each public function is a plain async wrapper around an internal
 * createServerFn, matching the downloads.ts/loyalty.ts pattern.
 */

export type { AffiliateLedgerRow, AffiliateProfileRow };

function db() {
  return drizzle(sql());
}

/** Case-insensitive exact handle lookup — matches the old handleExists()
 *  semantics (handle.toLowerCase() === handle.toLowerCase()), via a lower()
 *  comparison rather than ILIKE so a handle containing literal `%`/`_`
 *  can't be misread as a wildcard pattern. */
async function findAffiliateByHandle(
  database: ReturnType<typeof db>,
  handle: string,
): Promise<AffiliateProfileRow | null> {
  const rows = await database
    .select()
    .from(affiliateProfiles)
    .where(dsql`lower(${affiliateProfiles.handle}) = lower(${handle})`);
  return rows[0] ?? null;
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

/**
 * Resolves every `pending` ledger row for one affiliate that's already past
 * the hold period. For `payoutPreference: "cash"` this is a no-op — such a
 * row simply becomes visible to getPayableSummary/settleAffiliatePayout's own
 * "pending + past cutoff" query, no write needed. For "loyalty_credit", each
 * eligible row is atomically flipped to `converted` (a conditional update
 * guards against a concurrent caller already resolving the same row) and a
 * matching loyaltyLedger bonus entry is inserted directly — loyalty.ts's own
 * addLedgerEntry() always credits the *calling* session's own userId via
 * getUserId(), not an arbitrary target user, so it can't be reused here.
 *
 * Shared by dbResolvePendingLedgerEntries, dbGetPayableSummary, and
 * dbSettleAffiliatePayout so the resolution logic lives in one place instead
 * of being re-implemented per caller (matching cart.ts's loadCart() shape).
 */
async function resolveEligibleForAffiliate(
  database: ReturnType<typeof db>,
  affiliate: AffiliateProfileRow,
  settings: AffiliateSettings,
): Promise<void> {
  if (affiliate.payoutPreference !== "loyalty_credit") return;

  const cutoff = new Date(Date.now() - settings.holdPeriodDays * 24 * 60 * 60 * 1000);
  const eligibleRows = await database
    .select()
    .from(affiliateLedger)
    .where(
      and(
        eq(affiliateLedger.affiliateId, affiliate.id),
        eq(affiliateLedger.status, "pending"),
        lt(affiliateLedger.createdAt, cutoff),
      ),
    );
  if (eligibleRows.length === 0) return;

  const configRows = await database
    .select()
    .from(loyaltyConfig)
    .where(and(eq(loyaltyConfig.userId, affiliate.userId), eq(loyaltyConfig.status, "published")));
  const conversionRate = configRows[0]?.conversionRate ?? 100;

  for (const row of eligibleRows) {
    const [updated] = await database
      .update(affiliateLedger)
      .set({ status: "converted", resolvedAt: new Date() })
      .where(and(eq(affiliateLedger.id, row.id), eq(affiliateLedger.status, "pending")))
      .returning();
    if (!updated) continue; // already resolved by a concurrent caller

    const points = Math.round(Number(updated.commissionSlice) * conversionRate);
    await database.insert(loyaltyLedger).values({
      userId: affiliate.userId,
      type: "bonus",
      points,
      description: `Affiliate commission converted to loyalty credit (@${affiliate.handle})`,
    });
  }
}

/* ─── Internal server functions ─── */

const dbCaptureReferral = createServerFn({ method: "POST" })
  .validator((handle: string) => handle)
  .handler(async ({ data: handle }): Promise<void> => {
    const database = db();
    const affiliate = await findAffiliateByHandle(database, handle);
    if (!affiliate) return;

    const userId = await getUserId();
    const settings = await getAffiliateSettings();
    const referredAt = new Date();
    const expiresAt = daysFromNow(settings.attributionWindowDays);

    await database
      .insert(affiliateReferrals)
      .values({ userId, affiliateId: affiliate.id, referredAt, expiresAt })
      .onConflictDoUpdate({
        target: affiliateReferrals.userId,
        set: { affiliateId: affiliate.id, referredAt, expiresAt },
      });
  });

const dbRecordAffiliateClick = createServerFn({ method: "POST" })
  .validator((data: { handle: string; sourcePage: string }) => data)
  .handler(async ({ data }): Promise<void> => {
    const database = db();
    const affiliate = await findAffiliateByHandle(database, data.handle);
    if (!affiliate) return;

    const visitorUserId = await getUserId();
    await database.insert(affiliateClickEvents).values({
      affiliateId: affiliate.id,
      visitorUserId,
      sourcePage: data.sourcePage,
    });
  });

const dbCreditAffiliateForPurchase = createServerFn({ method: "POST" })
  .validator((data: { downloadId: string; productTitle: string; purchaseValue: number }) => data)
  .handler(async ({ data }): Promise<void> => {
    // Buyer identity comes from the session, never from the caller — this is
    // a client-callable server function and downloadId/purchaseValue are
    // client-supplied, but who gets charged/credited must not be.
    const buyerUserId = await getUserId();
    const database = db();

    const referralRows = await database
      .select()
      .from(affiliateReferrals)
      .where(eq(affiliateReferrals.userId, buyerUserId));
    const referral = referralRows[0];
    if (!referral) return;
    if (referral.expiresAt.getTime() < Date.now()) return;

    const affiliateRows = await database
      .select()
      .from(affiliateProfiles)
      .where(eq(affiliateProfiles.id, referral.affiliateId));
    const affiliate = affiliateRows[0];
    if (!affiliate) return;
    if (affiliate.userId === buyerUserId) return; // self-referral guard

    const settings = await getAffiliateSettings();
    const commissionSlice = Math.round(data.purchaseValue * settings.commissionRate * 100) / 100;

    await database.insert(affiliateLedger).values({
      affiliateId: affiliate.id,
      downloadId: data.downloadId,
      buyerUserId,
      productTitle: data.productTitle,
      purchaseValue: String(data.purchaseValue),
      commissionSlice: String(commissionSlice),
      status: "pending",
    });
  });

const dbVoidAffiliateLedgerForDownload = createServerFn({ method: "POST" })
  .validator((downloadId: string) => downloadId)
  .handler(async ({ data: downloadId }): Promise<void> => {
    // Defense in depth: the only intended caller (dbMarkDownloadsRefunded) is
    // already admin-gated, but every mutating handler in this project gates
    // itself individually rather than trusting caller context.
    await requireAdmin();
    await db()
      .update(affiliateLedger)
      .set({ status: "voided", resolvedAt: new Date() })
      .where(and(eq(affiliateLedger.downloadId, downloadId), eq(affiliateLedger.status, "pending")));
  });

/**
 * Deliberately NOT requireAdmin()-gated — this must run from the affiliate's
 * own non-admin dashboard load. Every side effect is bounded server-side:
 * it only resolves rows that are (a) pending, (b) already past
 * holdPeriodDays (computed here from `createdAt`, never trusted from a
 * caller flag), and (c) belong to whatever `affiliateId` is passed. An
 * arbitrary caller can at most force early resolution of an
 * already-legitimately-earned amount into that SAME affiliate's own
 * account, on that affiliate's own standing payoutPreference — it can never
 * fabricate value, redirect it, or bypass the hold period. Same reasoning
 * as dbAddCredits/dbAddLedgerEntry's documented ungated status.
 */
const dbResolvePendingLedgerEntries = createServerFn({ method: "POST" })
  .validator((affiliateId: string) => affiliateId)
  .handler(async ({ data: affiliateId }): Promise<void> => {
    const database = db();
    const affiliateRows = await database
      .select()
      .from(affiliateProfiles)
      .where(eq(affiliateProfiles.id, affiliateId));
    const affiliate = affiliateRows[0];
    if (!affiliate) return;

    const settings = await getAffiliateSettings();
    await resolveEligibleForAffiliate(database, affiliate, settings);
  });

const dbGetPayableSummary = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ affiliateId: string; handle: string; payableAmount: number; entryCount: number }[]> => {
    await requireAdmin();
    const database = db();
    const settings = await getAffiliateSettings();
    const cutoff = new Date(Date.now() - settings.holdPeriodDays * 24 * 60 * 60 * 1000);
    const affiliates = await database.select().from(affiliateProfiles);

    const summary: { affiliateId: string; handle: string; payableAmount: number; entryCount: number }[] = [];
    for (const affiliate of affiliates) {
      await resolveEligibleForAffiliate(database, affiliate, settings);

      const pendingRows = await database
        .select()
        .from(affiliateLedger)
        .where(
          and(
            eq(affiliateLedger.affiliateId, affiliate.id),
            eq(affiliateLedger.status, "pending"),
            lt(affiliateLedger.createdAt, cutoff),
          ),
        );
      if (pendingRows.length === 0) continue;

      const payableAmount =
        Math.round(pendingRows.reduce((sum, row) => sum + Number(row.commissionSlice), 0) * 100) / 100;
      if (payableAmount <= 0) continue;

      summary.push({
        affiliateId: affiliate.id,
        handle: affiliate.handle,
        payableAmount,
        entryCount: pendingRows.length,
      });
    }
    return summary;
  },
);

const dbSettleAffiliatePayout = createServerFn({ method: "POST" })
  .validator((data: { affiliateId: string; referenceNote: string }) => data)
  .handler(async ({ data }): Promise<{ amount: number }> => {
    await requireAdmin();
    const database = db();

    const affiliateRows = await database
      .select()
      .from(affiliateProfiles)
      .where(eq(affiliateProfiles.id, data.affiliateId));
    const affiliate = affiliateRows[0];
    if (!affiliate) return { amount: 0 };

    const settings = await getAffiliateSettings();
    await resolveEligibleForAffiliate(database, affiliate, settings);

    const cutoff = new Date(Date.now() - settings.holdPeriodDays * 24 * 60 * 60 * 1000);
    const eligibleRows = await database
      .select()
      .from(affiliateLedger)
      .where(
        and(
          eq(affiliateLedger.affiliateId, data.affiliateId),
          eq(affiliateLedger.status, "pending"),
          lt(affiliateLedger.createdAt, cutoff),
        ),
      );
    if (eligibleRows.length === 0) return { amount: 0 };

    const amount = Math.round(eligibleRows.reduce((sum, row) => sum + Number(row.commissionSlice), 0) * 100) / 100;
    const payoutId = crypto.randomUUID();
    const ledgerIds = eligibleRows.map((row) => row.id);

    // neon-http has no db.transaction() — .batch() is its atomic
    // alternative (see mergeAnonymousUser.ts). The payout id is generated
    // client-side so the insert and the ledger update can be issued as one
    // atomic batch instead of insert-then-read-id-then-update.
    const ops = [
      database.insert(affiliatePayouts).values({
        id: payoutId,
        affiliateId: data.affiliateId,
        amount: String(amount),
        referenceNote: data.referenceNote,
      }),
      database
        .update(affiliateLedger)
        .set({ status: "paid", payoutId, resolvedAt: new Date() })
        .where(inArray(affiliateLedger.id, ledgerIds)),
    ];
    await database.batch(ops as unknown as [(typeof ops)[number], ...(typeof ops)[number][]]);

    return { amount };
  });

/* ─── Public API ─── */

export async function captureReferral(handle: string): Promise<void> {
  return dbCaptureReferral({ data: handle });
}

export async function recordAffiliateClick(handle: string, sourcePage: string): Promise<void> {
  return dbRecordAffiliateClick({ data: { handle, sourcePage } });
}

export async function creditAffiliateForPurchase(data: {
  downloadId: string;
  productTitle: string;
  purchaseValue: number;
}): Promise<void> {
  return dbCreditAffiliateForPurchase({ data });
}

export async function voidAffiliateLedgerForDownload(downloadId: string): Promise<void> {
  return dbVoidAffiliateLedgerForDownload({ data: downloadId });
}

export async function resolvePendingLedgerEntries(affiliateId: string): Promise<void> {
  return dbResolvePendingLedgerEntries({ data: affiliateId });
}

export async function getPayableSummary(): Promise<
  { affiliateId: string; handle: string; payableAmount: number; entryCount: number }[]
> {
  return dbGetPayableSummary();
}

export async function settleAffiliatePayout(
  affiliateId: string,
  referenceNote: string,
): Promise<{ amount: number }> {
  return dbSettleAffiliatePayout({ data: { affiliateId, referenceNote } });
}
