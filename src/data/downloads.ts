import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "~/db";
import { downloads, type DownloadRow } from "~/db/schema";
import { getUserId } from "~/lib/getUserId";
import { requireAdmin } from "~/lib/requireAdmin";

/**
 * Phase 3 (Step 26): DB-backed download ledger, replacing the localStorage
 * version. Rows are keyed by the Better Auth user_id (src/lib/getUserId.ts)
 * — every visitor, guest or logged-in, has one via the `anonymous` plugin.
 * Flight Recorder was never wired into this module, so there's nothing to
 * remove there.
 *
 * Each public function is a plain async wrapper around an internal
 * createServerFn, preserving the original call signature.
 *
 * dbGetDownloads returns whatever rows the owner actually has, including
 * none — no first-visit demo seeding.
 */

export interface DownloadRecord {
  id: string;
  productId: string;
  productTitle: string;
  productAuthor: string;
  productType: "ebook" | "audiobook" | "video";
  price: number;
  purchasedAt: string; // ISO date
  lastDownloadedAt: string | null; // ISO date or null
  downloadCount: number;
  sessionId: string | null;
  status: "active" | "refunded";
}

function db() {
  return drizzle(sql());
}

function rowToRecord(row: DownloadRow): DownloadRecord {
  return {
    id: row.id,
    productId: row.productId,
    productTitle: row.productTitle,
    productAuthor: row.productAuthor,
    productType: row.productType as DownloadRecord["productType"],
    price: Number(row.price),
    purchasedAt: row.purchasedAt.toISOString(),
    lastDownloadedAt: row.lastDownloadedAt ? row.lastDownloadedAt.toISOString() : null,
    downloadCount: row.downloadCount,
    sessionId: row.sessionId,
    status: row.status as DownloadRecord["status"],
  };
}

/* ─── Internal server functions ─── */

const dbGetDownloads = createServerFn({ method: "GET" }).handler(
  async (): Promise<DownloadRecord[]> => {
    const userId = await getUserId();
    const database = db();
    const rows = await database.select().from(downloads).where(eq(downloads.userId, userId));
    return rows.map(rowToRecord);
  },
);

const dbIncrementDownloadCount = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data: id }): Promise<void> => {
    const userId = await getUserId();
    const database = db();
    const rows = await database
      .select()
      .from(downloads)
      .where(and(eq(downloads.id, id), eq(downloads.userId, userId)));
    const row = rows[0];
    if (!row) return;
    await database
      .update(downloads)
      .set({ downloadCount: row.downloadCount + 1, lastDownloadedAt: new Date() })
      .where(eq(downloads.id, id));
  });

const dbGetDownloadsForSession = createServerFn({ method: "GET" })
  .validator((sessionId: string) => sessionId)
  .handler(async ({ data: sessionId }): Promise<DownloadRecord[]> => {
    const userId = await getUserId();
    const rows = await db()
      .select()
      .from(downloads)
      .where(and(eq(downloads.userId, userId), eq(downloads.sessionId, sessionId)));
    return rows.map(rowToRecord);
  });

const dbMarkSingleDownloadRefunded = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data: id }): Promise<void> => {
    await requireAdmin();
    // Scoped by the download's own id — deliberately not sessionId. Refund
    // claims (src/data/refunds.ts) are per-download, and a session can carry
    // several downloads; flipping the whole session would wrongly refund
    // items the buyer never claimed.
    await db().update(downloads).set({ status: "refunded" }).where(eq(downloads.id, id));
  });

/* ─── Public API ─── */

export async function getDownloads(): Promise<DownloadRecord[]> {
  return dbGetDownloads();
}

export async function incrementDownloadCount(id: string): Promise<void> {
  return dbIncrementDownloadCount({ data: id });
}

/** Read-only, scoped to the caller's own session — used by
 *  checkout-success.tsx to poll for the webhook's work landing, without
 *  trusting a client-supplied session_id to belong to the current visitor. */
export async function getDownloadsForSession(sessionId: string): Promise<DownloadRecord[]> {
  return dbGetDownloadsForSession({ data: sessionId });
}

/**
 * Server-to-server insert for src/routes/api/stripe/webhook.ts. userId
 * comes from trusted checkout-session metadata (never from the webhook
 * request itself, which carries no buyer session). Inserts with
 * onConflictDoNothing() against the (sessionId, productId) unique index —
 * this is what makes a redelivered Stripe webhook event safe to reprocess:
 * a duplicate insert silently no-ops instead of racing a read-then-write
 * existence check. Returns the inserted row, or null if this (sessionId,
 * productId) pair was already recorded (i.e. this was a retry).
 * Not a createServerFn — never reachable as an RPC endpoint.
 */
export async function insertDownloadIfNew(record: {
  userId: string;
  productId: string;
  productTitle: string;
  productAuthor: string;
  productType: "ebook" | "audiobook" | "video";
  price: number;
  purchasedAt: Date;
  sessionId: string;
  stripePaymentIntentId: string | null;
}): Promise<DownloadRecord | null> {
  const [row] = await db()
    .insert(downloads)
    .values({
      userId: record.userId,
      productId: record.productId,
      productTitle: record.productTitle,
      productAuthor: record.productAuthor,
      productType: record.productType,
      price: String(record.price),
      purchasedAt: record.purchasedAt,
      lastDownloadedAt: null,
      downloadCount: 0,
      sessionId: record.sessionId,
      stripePaymentIntentId: record.stripePaymentIntentId,
    })
    .onConflictDoNothing({ target: [downloads.sessionId, downloads.productId] })
    .returning();
  return row ? rowToRecord(row) : null;
}

/** Flips exactly one download row to "refunded" — the per-download
 *  counterpart used by refunds.ts's real refund-approval path. */
export async function markSingleDownloadRefunded(id: string): Promise<void> {
  return dbMarkSingleDownloadRefunded({ data: id });
}
