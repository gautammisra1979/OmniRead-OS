import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "~/db";
import { refundClaims, type RefundClaimRow } from "~/db/schema";
import { getOrCreateOwnerId } from "~/lib/ownerId";
import { requireAdmin } from "~/lib/requireAdmin";

/**
 * Phase 1 (Step 26): DB-backed refund claims, replacing the localStorage
 * version. Rows are keyed by the anonymous ownerId cookie
 * (src/lib/ownerId.ts) rather than a real user_id — swap once Better Auth
 * lands.
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
    const ownerId = getOrCreateOwnerId();
    const rows = await db()
      .select()
      .from(refundClaims)
      .where(eq(refundClaims.ownerId, ownerId));
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
    const ownerId = getOrCreateOwnerId();
    const [row] = await db()
      .insert(refundClaims)
      .values({
        ownerId,
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
    const ownerId = getOrCreateOwnerId();
    const [row] = await db()
      .update(refundClaims)
      .set({
        status: input.status,
        resolvedAt: new Date(),
        ...(input.adminNotes ? { adminNotes: input.adminNotes } : {}),
      })
      .where(and(eq(refundClaims.id, input.id), eq(refundClaims.ownerId, ownerId)))
      .returning();
    return row ? rowToClaim(row) : null;
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
