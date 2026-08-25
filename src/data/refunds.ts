import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "~/db";
import { downloads, refundClaims, type RefundClaimRow } from "~/db/schema";
import { getUserId } from "~/lib/getUserId";
import { requireAdmin } from "~/lib/requireAdmin";
import { stripe } from "~/lib/stripe";
import { markSingleDownloadRefunded } from "~/data/downloads";
import { voidAffiliateLedgerForDownload } from "~/data/affiliateProgram";
import { clawbackLoyaltyPointsForBuyer } from "~/data/loyalty";

/**
 * Phase 1 (Step 26): DB-backed refund claims, replacing the localStorage
 * version. Rows are keyed by the Better Auth user_id (src/lib/getUserId.ts)
 * — every visitor, guest or logged-in, has one via the `anonymous` plugin.
 *
 * Each public function is a plain async wrapper around an internal
 * createServerFn, preserving the original call signature.
 */

export type RefundStatus = "pending" | "approved" | "rejected";

export interface RefundClaim {
  id: string;
  downloadId: string;
  productId: string;
  productTitle: string;
  transactionId: string;
  reason: string;
  status: RefundStatus;
  requestedAt: string;
  resolvedAt: string | null;
  refundLoyaltyPoints: number;
  adminNotes?: string;
}

function db() {
  return drizzle(sql());
}

function rowToClaim(row: RefundClaimRow): RefundClaim {
  return {
    id: row.id,
    downloadId: row.downloadId,
    productId: row.productId,
    productTitle: row.productTitle,
    transactionId: row.transactionId,
    reason: row.reason,
    status: row.status as RefundStatus,
    requestedAt: row.requestedAt.toISOString(),
    resolvedAt: row.resolvedAt ? row.resolvedAt.toISOString() : null,
    refundLoyaltyPoints: row.refundLoyaltyPoints,
    adminNotes: row.adminNotes ?? undefined,
  };
}

/* ─── Internal server functions ─── */

const dbGetRefundClaims = createServerFn({ method: "GET" }).handler(
  async (): Promise<RefundClaim[]> => {
    const userId = await getUserId();
    const rows = await db()
      .select()
      .from(refundClaims)
      .where(eq(refundClaims.userId, userId));
    return rows.map(rowToClaim);
  },
);

const dbSubmitRefundClaim = createServerFn({ method: "POST" })
  .validator(
    (input: {
      downloadId: string;
      productId: string;
      productTitle: string;
      transactionId: string;
      reason: string;
      refundLoyaltyPoints: number;
    }) => input,
  )
  .handler(async ({ data: input }): Promise<RefundClaim> => {
    const userId = await getUserId();
    const [row] = await db()
      .insert(refundClaims)
      .values({
        userId,
        downloadId: input.downloadId,
        productId: input.productId,
        productTitle: input.productTitle,
        transactionId: input.transactionId,
        reason: input.reason,
        refundLoyaltyPoints: input.refundLoyaltyPoints,
      })
      .returning();
    return rowToClaim(row);
  });

const dbResolveRefundClaim = createServerFn({ method: "POST" })
  .validator(
    (input: { id: string; status: "approved" | "rejected"; adminNotes?: string }) => input,
  )
  .handler(async ({ data: input }): Promise<RefundClaim | null> => {
    await requireAdmin();
    const database = db();

    // No more scoping by the admin's own userId — requireAdmin() already
    // gates the caller, and a claim belongs to the buyer, not whoever
    // happens to click Approve (that was the bug: any claim not owned by
    // the admin's own account silently no-oped). `status = 'pending'` here
    // doubles as the idempotency guard: a second call for a claim already
    // resolved (retried request, doubled click) matches zero rows and is
    // treated below as "already resolved" rather than reprocessed.
    const pendingRows = await database
      .select()
      .from(refundClaims)
      .where(and(eq(refundClaims.id, input.id), eq(refundClaims.status, "pending")));
    const claim = pendingRows[0];
    if (!claim) return null;

    if (input.status === "approved") {
      const downloadRows = await database.select().from(downloads).where(eq(downloads.id, claim.downloadId));
      const download = downloadRows[0];

      if (!download) {
        console.error(`[refunds] claim ${claim.id} references missing download ${claim.downloadId} — approving without a Stripe refund`);
      } else if (!download.stripePaymentIntentId) {
        // Shouldn't happen for anything created after the Checkout Sessions
        // prompt landed, but old/pre-migration data might lack it.
        console.error(`[refunds] download ${download.id} has no stripePaymentIntentId (pre-Checkout-Sessions data?) — approving claim ${claim.id} without a Stripe refund`);
      } else {
        try {
          // Stripe call first, DB status flip second — a failed refund must
          // never let the claim show as approved.
          await stripe().refunds.create({
            payment_intent: download.stripePaymentIntentId,
            amount: Math.round(Number(download.price) * 100),
          });
        } catch (error) {
          console.error(`[refunds] Stripe refund failed for claim ${claim.id}, download ${download.id}:`, error);
          return null; // claim stays pending — safe to retry
        }
      }
    }

    // Re-guarded by status = 'pending' again — this is the statement that
    // actually commits the resolution, issued only after any Stripe refund
    // above has already succeeded.
    const [row] = await database
      .update(refundClaims)
      .set({
        status: input.status,
        resolvedAt: new Date(),
        ...(input.adminNotes ? { adminNotes: input.adminNotes } : {}),
      })
      .where(and(eq(refundClaims.id, input.id), eq(refundClaims.status, "pending")))
      .returning();
    if (!row) return null;

    if (input.status === "approved") {
      await markSingleDownloadRefunded(claim.downloadId);
      await voidAffiliateLedgerForDownload(claim.downloadId);
      if (claim.refundLoyaltyPoints > 0) {
        await clawbackLoyaltyPointsForBuyer(
          claim.userId,
          claim.refundLoyaltyPoints,
          `Refund clawback for "${claim.productTitle}"`,
        );
      }
    }

    return rowToClaim(row);
  });

/* ─── Public API ─── */

export async function getRefundClaims(): Promise<RefundClaim[]> {
  return dbGetRefundClaims();
}

export async function submitRefundClaim(input: {
  downloadId: string;
  productId: string;
  productTitle: string;
  transactionId: string;
  reason: string;
  refundLoyaltyPoints: number;
}): Promise<RefundClaim> {
  return dbSubmitRefundClaim({ data: input });
}

export async function approveRefundClaim(
  id: string,
  adminNotes?: string,
): Promise<RefundClaim | null> {
  return dbResolveRefundClaim({ data: { id, status: "approved", adminNotes } });
}

export async function rejectRefundClaim(
  id: string,
  adminNotes?: string,
): Promise<RefundClaim | null> {
  return dbResolveRefundClaim({ data: { id, status: "rejected", adminNotes } });
}

export async function getPendingRefundClaims(): Promise<RefundClaim[]> {
  const claims = await getRefundClaims();
  return claims.filter((c) => c.status === "pending");
}

export async function getClaimCounts(): Promise<{
  pending: number;
  approved: number;
  rejected: number;
}> {
  const claims = await getRefundClaims();
  return {
    pending: claims.filter((c) => c.status === "pending").length,
    approved: claims.filter((c) => c.status === "approved").length,
    rejected: claims.filter((c) => c.status === "rejected").length,
  };
}
