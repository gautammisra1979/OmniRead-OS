import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { and, desc, eq, inArray, lt, sql as dsql } from "drizzle-orm";
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
  type AffiliatePayoutRow,
} from "~/db/schema";
import { getUserId } from "~/lib/getUserId";
import { requireAdmin } from "~/lib/requireAdmin";
import { auth } from "~/lib/auth";
import { getAffiliateSettings, type AffiliateSettings } from "~/data/affiliateSettings";

/**
 * Tier A: the real affiliate backend. Replaces the pieces of the localStorage
 * model (src/data/affiliate.ts) that have no server-side equivalent —
 * referral capture, commission crediting, refund voiding, and payout
 * settlement.
 *
 * Tier B (this pass) adds the profile CRUD, admin listing, payout history,
 * and computed ledger display-status functions the UI actually calls, and
 * rewires every UI consumer onto this backend — src/data/affiliate.ts and
 * its old localStorage model are gone.
 *
 * Each public function is a plain async wrapper around an internal
 * createServerFn, matching the downloads.ts/loyalty.ts pattern.
 */

export type { AffiliateLedgerRow, AffiliateProfileRow, AffiliatePayoutRow };

/** Thrown by registerAffiliateProfile() when the calling session is
 *  anonymous. Affiliate profiles are tied to a durable account on purpose —
 *  an anonymous session's user row has no long-term identity (email,
 *  password) to receive payouts against or to log back in with later.
 *
 *  NOTE (confirmed live): TanStack Start server functions do not preserve
 *  Error subclass identity across the RPC boundary — a caller on the client
 *  sees `instanceof AffiliateRegistrationRequiresAccountError` and
 *  `error.name` both come back false/"Error". Only `.message` survives the
 *  round trip, so that's the actual contract client code must match on
 *  (see AffiliateSetup.tsx). The `.name` set below is still useful for any
 *  server-side caller that never crosses the RPC boundary. */
export class AffiliateRegistrationRequiresAccountError extends Error {
  constructor() {
    super("Affiliate registration requires a real account. Sign up first.");
    this.name = "AffiliateRegistrationRequiresAccountError";
  }
}

/** Thrown by registerAffiliateProfile() when the normalized handle is
 *  already taken by another affiliate. Same RPC-serialization caveat as
 *  AffiliateRegistrationRequiresAccountError above — match on `.message`
 *  client-side, not `.name`/`instanceof`. */
export class AffiliateHandleTakenError extends Error {
  constructor(public readonly handle: string) {
    super("Handle already taken. Try another.");
    this.name = "AffiliateHandleTakenError";
  }
}

export type LedgerDisplayStatus = "in_hold" | "payable" | "paid" | "converted" | "voided";

function db() {
  return drizzle(sql());
}

/** Same session lookup shape as getUserId.ts, plus the is_anonymous check
 *  (see auth-schema.ts's `user.isAnonymous`) that registerAffiliateProfile()
 *  needs and getUserId() deliberately doesn't have. */
async function getRealUserId(): Promise<string> {
  const session = await auth.api.getSession({ headers: getRequestHeaders() });
  if (!session) throw new Error("No session — anonymous sign-in should have run on app load");
  if (session.user.isAnonymous) throw new AffiliateRegistrationRequiresAccountError();
  return session.user.id;
}

/** Shared by getMyAffiliateLedger and getAffiliateLedgerForAdmin so the
 *  hold-period computation lives in one place. `status: "pending"` is the
 *  only stored status that needs a computed split — see affiliate_ledger's
 *  schema comment on why "approved" was never a stored state. */
function toDisplayStatus(row: AffiliateLedgerRow, settings: AffiliateSettings): LedgerDisplayStatus {
  if (row.status === "paid") return "paid";
  if (row.status === "converted") return "converted";
  if (row.status === "voided") return "voided";
  const cutoff = new Date(Date.now() - settings.holdPeriodDays * 24 * 60 * 60 * 1000);
  return row.createdAt < cutoff ? "payable" : "in_hold";
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

/* ─── Internal server functions: Profile CRUD (self-scoped) ─── */

const dbRegisterAffiliateProfile = createServerFn({ method: "POST" })
  .validator(
    (data: {
      handle: string;
      brandName: string;
      paymentMethod: "paypal" | "venmo" | "crypto";
      paymentDetail: string;
    }) => data,
  )
  .handler(async ({ data }): Promise<AffiliateProfileRow> => {
    const userId = await getRealUserId();
    const database = db();

    const normalizedHandle = data.handle.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_");
    const existing = await findAffiliateByHandle(database, normalizedHandle);
    if (existing) throw new AffiliateHandleTakenError(normalizedHandle);

    const [row] = await database
      .insert(affiliateProfiles)
      .values({
        userId,
        handle: normalizedHandle,
        brandName: data.brandName.trim(),
        paymentMethod: data.paymentMethod,
        paymentDetail: data.paymentDetail,
        payoutPreference: "cash",
      })
      .returning();
    return row;
  });

const dbUpdateAffiliateProfile = createServerFn({ method: "POST" })
  .validator(
    (data: {
      brandName?: string;
      paymentMethod?: "paypal" | "venmo" | "crypto";
      paymentDetail?: string;
      payoutPreference?: "cash" | "loyalty_credit";
    }) => data,
  )
  .handler(async ({ data }): Promise<void> => {
    const userId = await getUserId();
    const database = db();

    const rows = await database.select().from(affiliateProfiles).where(eq(affiliateProfiles.userId, userId));
    if (!rows[0]) throw new Error("No affiliate profile found for this account.");

    await database
      .update(affiliateProfiles)
      .set({
        ...(data.brandName !== undefined ? { brandName: data.brandName } : {}),
        ...(data.paymentMethod !== undefined ? { paymentMethod: data.paymentMethod } : {}),
        ...(data.paymentDetail !== undefined ? { paymentDetail: data.paymentDetail } : {}),
        ...(data.payoutPreference !== undefined ? { payoutPreference: data.payoutPreference } : {}),
      })
      .where(eq(affiliateProfiles.userId, userId));
  });

const dbGetMyAffiliateProfile = createServerFn({ method: "GET" }).handler(
  async (): Promise<AffiliateProfileRow | null> => {
    const userId = await getUserId();
    const rows = await db().select().from(affiliateProfiles).where(eq(affiliateProfiles.userId, userId));
    return rows[0] ?? null;
  },
);

const dbGetMyAffiliateLedger = createServerFn({ method: "GET" }).handler(
  async (): Promise<(AffiliateLedgerRow & { displayStatus: LedgerDisplayStatus })[]> => {
    const userId = await getUserId();
    const database = db();

    const profileRows = await database.select().from(affiliateProfiles).where(eq(affiliateProfiles.userId, userId));
    const profile = profileRows[0];
    if (!profile) return [];

    const settings = await getAffiliateSettings();
    // This is "the affiliate's own non-admin dashboard load" that
    // resolveEligibleForAffiliate's docstring refers to — nothing else in
    // the self-scoped API triggers loyalty-credit conversion, so it has to
    // happen here.
    await resolveEligibleForAffiliate(database, profile, settings);

    const rows = await database
      .select()
      .from(affiliateLedger)
      .where(eq(affiliateLedger.affiliateId, profile.id))
      .orderBy(desc(affiliateLedger.createdAt));
    return rows.map((row) => ({ ...row, displayStatus: toDisplayStatus(row, settings) }));
  },
);

const dbGetMyClickCount = createServerFn({ method: "GET" }).handler(async (): Promise<number> => {
  const userId = await getUserId();
  const database = db();

  const profileRows = await database.select().from(affiliateProfiles).where(eq(affiliateProfiles.userId, userId));
  const profile = profileRows[0];
  if (!profile) return 0;

  const rows = await database
    .select()
    .from(affiliateClickEvents)
    .where(eq(affiliateClickEvents.affiliateId, profile.id));
  return rows.length;
});

/* ─── Internal server functions: Admin ─── */

const dbGetAllAffiliateProfiles = createServerFn({ method: "GET" }).handler(
  async (): Promise<AffiliateProfileRow[]> => {
    await requireAdmin();
    return db().select().from(affiliateProfiles).orderBy(desc(affiliateProfiles.registeredAt));
  },
);

const dbGetAffiliateLedgerForAdmin = createServerFn({ method: "GET" })
  .validator((affiliateId: string) => affiliateId)
  .handler(async ({ data: affiliateId }): Promise<(AffiliateLedgerRow & { displayStatus: LedgerDisplayStatus })[]> => {
    await requireAdmin();
    const database = db();
    const settings = await getAffiliateSettings();

    const affiliateRows = await database.select().from(affiliateProfiles).where(eq(affiliateProfiles.id, affiliateId));
    if (affiliateRows[0]) await resolveEligibleForAffiliate(database, affiliateRows[0], settings);

    const rows = await database
      .select()
      .from(affiliateLedger)
      .where(eq(affiliateLedger.affiliateId, affiliateId))
      .orderBy(desc(affiliateLedger.createdAt));
    return rows.map((row) => ({ ...row, displayStatus: toDisplayStatus(row, settings) }));
  });

const dbGetPayoutHistory = createServerFn({ method: "GET" })
  .validator((affiliateId: string | undefined) => affiliateId)
  .handler(async ({ data: affiliateId }): Promise<AffiliatePayoutRow[]> => {
    await requireAdmin();
    const database = db();
    if (affiliateId) {
      return database
        .select()
        .from(affiliatePayouts)
        .where(eq(affiliatePayouts.affiliateId, affiliateId))
        .orderBy(desc(affiliatePayouts.settledAt));
    }
    return database.select().from(affiliatePayouts).orderBy(desc(affiliatePayouts.settledAt));
  });

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

/** Shared by dbCreditAffiliateForPurchase (client path, buyerUserId from
 *  session) and creditAffiliateForPurchaseForBuyer (server-to-server path,
 *  e.g. the Stripe webhook, where buyerUserId comes from trusted checkout
 *  session metadata instead). */
async function creditAffiliateForBuyer(
  buyerUserId: string,
  data: { downloadId: string; productTitle: string; purchaseValue: number },
): Promise<void> {
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
}

const dbCreditAffiliateForPurchase = createServerFn({ method: "POST" })
  .validator((data: { downloadId: string; productTitle: string; purchaseValue: number }) => data)
  .handler(async ({ data }): Promise<void> => {
    // Buyer identity comes from the session, never from the caller — this is
    // a client-callable server function and downloadId/purchaseValue are
    // client-supplied, but who gets charged/credited must not be.
    const buyerUserId = await getUserId();
    await creditAffiliateForBuyer(buyerUserId, data);
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

export interface PayableSummaryRow {
  affiliateId: string;
  handle: string;
  brandName: string;
  payableAmount: number;
  payableCount: number;
  inHoldAmount: number;
  inHoldCount: number;
}

const dbGetPayableSummary = createServerFn({ method: "GET" }).handler(
  async (): Promise<PayableSummaryRow[]> => {
    await requireAdmin();
    const database = db();
    const settings = await getAffiliateSettings();
    const cutoff = new Date(Date.now() - settings.holdPeriodDays * 24 * 60 * 60 * 1000);
    const affiliates = await database.select().from(affiliateProfiles);

    const summary: PayableSummaryRow[] = [];
    for (const affiliate of affiliates) {
      await resolveEligibleForAffiliate(database, affiliate, settings);

      const pendingRows = await database
        .select()
        .from(affiliateLedger)
        .where(and(eq(affiliateLedger.affiliateId, affiliate.id), eq(affiliateLedger.status, "pending")));

      // Split by hold-period cutoff instead of filtering it out of the query
      // — the store owner explicitly needs to see what's still in hold, not
      // just what's payable now (this is the one thing dbGetPayableSummary
      // used to silently drop).
      const payableRows = pendingRows.filter((row) => row.createdAt < cutoff);
      const inHoldRows = pendingRows.filter((row) => row.createdAt >= cutoff);

      const payableAmount = Math.round(payableRows.reduce((sum, row) => sum + Number(row.commissionSlice), 0) * 100) / 100;
      const inHoldAmount = Math.round(inHoldRows.reduce((sum, row) => sum + Number(row.commissionSlice), 0) * 100) / 100;
      if (payableAmount <= 0 && inHoldAmount <= 0) continue;

      summary.push({
        affiliateId: affiliate.id,
        handle: affiliate.handle,
        brandName: affiliate.brandName,
        payableAmount,
        payableCount: payableRows.length,
        inHoldAmount,
        inHoldCount: inHoldRows.length,
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

/* ─── Public API: Profile CRUD (self-scoped) ─── */

export async function registerAffiliateProfile(data: {
  handle: string;
  brandName: string;
  paymentMethod: "paypal" | "venmo" | "crypto";
  paymentDetail: string;
}): Promise<AffiliateProfileRow> {
  return dbRegisterAffiliateProfile({ data });
}

export async function updateAffiliateProfile(data: {
  brandName?: string;
  paymentMethod?: "paypal" | "venmo" | "crypto";
  paymentDetail?: string;
  payoutPreference?: "cash" | "loyalty_credit";
}): Promise<void> {
  return dbUpdateAffiliateProfile({ data });
}

export async function getMyAffiliateProfile(): Promise<AffiliateProfileRow | null> {
  return dbGetMyAffiliateProfile();
}

export async function getMyAffiliateLedger(): Promise<
  (AffiliateLedgerRow & { displayStatus: LedgerDisplayStatus })[]
> {
  return dbGetMyAffiliateLedger();
}

export async function getMyClickCount(): Promise<number> {
  return dbGetMyClickCount();
}

/* ─── Public API: Admin ─── */

export async function getAllAffiliateProfiles(): Promise<AffiliateProfileRow[]> {
  return dbGetAllAffiliateProfiles();
}

export async function getAffiliateLedgerForAdmin(
  affiliateId: string,
): Promise<(AffiliateLedgerRow & { displayStatus: LedgerDisplayStatus })[]> {
  return dbGetAffiliateLedgerForAdmin({ data: affiliateId });
}

export async function getPayoutHistory(affiliateId?: string): Promise<AffiliatePayoutRow[]> {
  return dbGetPayoutHistory({ data: affiliateId });
}

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

/**
 * Server-to-server variant for src/routes/api/stripe/webhook.ts, where
 * there is no buyer session on the incoming request — buyerUserId here must
 * come from a trusted source (the Stripe checkout session's own metadata,
 * itself set server-side at session-creation time), never from an
 * untrusted caller. Not a createServerFn — never reachable as an RPC
 * endpoint, unlike creditAffiliateForPurchase() above.
 */
export async function creditAffiliateForPurchaseForBuyer(
  buyerUserId: string,
  data: { downloadId: string; productTitle: string; purchaseValue: number },
): Promise<void> {
  return creditAffiliateForBuyer(buyerUserId, data);
}

export async function voidAffiliateLedgerForDownload(downloadId: string): Promise<void> {
  return dbVoidAffiliateLedgerForDownload({ data: downloadId });
}

export async function resolvePendingLedgerEntries(affiliateId: string): Promise<void> {
  return dbResolvePendingLedgerEntries({ data: affiliateId });
}

export async function getPayableSummary(): Promise<PayableSummaryRow[]> {
  return dbGetPayableSummary();
}

export async function settleAffiliatePayout(
  affiliateId: string,
  referenceNote: string,
): Promise<{ amount: number }> {
  return dbSettleAffiliatePayout({ data: { affiliateId, referenceNote } });
}
