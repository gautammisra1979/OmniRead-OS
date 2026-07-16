/**
 * Refund claims data module.
 * Stores refund requests in localStorage with pending/approved/rejected status.
 * Includes loyalty point reversion logic.
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

const STORAGE_KEY = "omnimedia_refund_claims";

function generateId(): string {
  return `refund-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function getRefundClaims(): RefundClaim[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RefundClaim[]) : [];
  } catch {
    return [];
  }
}

function saveRefundClaims(claims: RefundClaim[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(claims));
  }
}

export function submitRefundClaim(input: {
  downloadId: string;
  productId: string;
  productTitle: string;
  transactionId: string;
  reason: string;
  refundLoyaltyPoints: number;
}): RefundClaim {
  const claim: RefundClaim = {
    id: generateId(),
    downloadId: input.downloadId,
    productId: input.productId,
    productTitle: input.productTitle,
    transactionId: input.transactionId,
    reason: input.reason,
    status: "pending",
    requestedAt: new Date().toISOString(),
    resolvedAt: null,
    refundLoyaltyPoints: input.refundLoyaltyPoints,
  };
  const claims = getRefundClaims();
  claims.push(claim);
  saveRefundClaims(claims);
  return claim;
}

export function approveRefundClaim(
  id: string,
  adminNotes?: string
): RefundClaim | null {
  const claims = getRefundClaims();
  const idx = claims.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  claims[idx].status = "approved";
  claims[idx].resolvedAt = new Date().toISOString();
  if (adminNotes) claims[idx].adminNotes = adminNotes;
  saveRefundClaims(claims);
  return claims[idx];
}

export function rejectRefundClaim(
  id: string,
  adminNotes?: string
): RefundClaim | null {
  const claims = getRefundClaims();
  const idx = claims.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  claims[idx].status = "rejected";
  claims[idx].resolvedAt = new Date().toISOString();
  if (adminNotes) claims[idx].adminNotes = adminNotes;
  saveRefundClaims(claims);
  return claims[idx];
}

export function getPendingRefundClaims(): RefundClaim[] {
  return getRefundClaims().filter((c) => c.status === "pending");
}

export function getClaimCounts(): { pending: number; approved: number; rejected: number } {
  const claims = getRefundClaims();
  return {
    pending: claims.filter((c) => c.status === "pending").length,
    approved: claims.filter((c) => c.status === "approved").length,
    rejected: claims.filter((c) => c.status === "rejected").length,
  };
}
