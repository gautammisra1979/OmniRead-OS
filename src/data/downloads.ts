import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "~/db";
import { downloads, type DownloadRow, type NewDownloadRow } from "~/db/schema";
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

/** Demo records seeded for a first-time owner — same 3 records that used to
 *  be hardcoded in seedDemoDownloads(), now inserted per-owner on first
 *  read instead of once per browser localStorage blob. */
function demoRecords(userId: string): NewDownloadRow[] {
  const now = Date.now();
  const daysAgo = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000);

  return [
    {
      userId,
      productId: "product-1",
      productTitle: "The Resilient Mind",
      productAuthor: "Dr. Amara Osei",
      productType: "ebook",
      price: "14.99",
      purchasedAt: daysAgo(3),
      lastDownloadedAt: daysAgo(1),
      downloadCount: 2,
    },
    {
      userId,
      productId: "product-2",
      productTitle: "Mindful Moments",
      productAuthor: "Lena K. Hart",
      productType: "audiobook",
      price: "9.99",
      purchasedAt: daysAgo(7),
      lastDownloadedAt: daysAgo(5),
      downloadCount: 1,
    },
    {
      userId,
      productId: "product-3",
      productTitle: "Wellness Mastery",
      productAuthor: "Dr. Marcus Vega",
      productType: "video",
      price: "24.99",
      purchasedAt: daysAgo(1),
      lastDownloadedAt: null,
      downloadCount: 0,
    },
  ];
}

/* ─── Internal server functions ─── */

const dbGetDownloads = createServerFn({ method: "GET" }).handler(
  async (): Promise<DownloadRecord[]> => {
    const userId = await getUserId();
    const database = db();
    const rows = await database.select().from(downloads).where(eq(downloads.userId, userId));
    if (rows.length > 0) return rows.map(rowToRecord);

    // First visit for this owner — seed the demo records.
    const seeded = await database.insert(downloads).values(demoRecords(userId)).returning();
    return seeded.map(rowToRecord);
  },
);

const dbAddDownload = createServerFn({ method: "POST" })
  .validator(
    (record: {
      productId: string;
      productTitle: string;
      productAuthor: string;
      productType: "ebook" | "audiobook" | "video";
      price: number;
      purchasedAt: string;
      sessionId: string;
    }) => record,
  )
  .handler(async ({ data: record }): Promise<DownloadRecord> => {
    const userId = await getUserId();
    const [row] = await db()
      .insert(downloads)
      .values({
        userId,
        productId: record.productId,
        productTitle: record.productTitle,
        productAuthor: record.productAuthor,
        productType: record.productType,
        price: String(record.price),
        purchasedAt: new Date(record.purchasedAt),
        lastDownloadedAt: null,
        downloadCount: 0,
        sessionId: record.sessionId,
      })
      .returning();
    return rowToRecord(row);
  });

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

const dbMarkDownloadsRefunded = createServerFn({ method: "POST" })
  .validator((sessionId: string) => sessionId)
  .handler(async ({ data: sessionId }): Promise<string[]> => {
    await requireAdmin();
    // Scoped by sessionId alone — a real, effectively-unique key generated
    // per checkout session in stripeCheckout.ts. The old `and(eq(userId,
    // ...))` condition compared against the *admin's own* userId (from
    // getUserId()), not the download's actual owner, so it silently no-oped
    // for any real buyer's refund. Fixed here, not just refactored.
    const rows = await db()
      .update(downloads)
      .set({ status: "refunded" })
      .where(eq(downloads.sessionId, sessionId))
      .returning();
    return rows.map((row) => row.id);
  });

/* ─── Public API ─── */

export async function getDownloads(): Promise<DownloadRecord[]> {
  return dbGetDownloads();
}

/** Insert a new download row (called from stripeCheckout.ts on purchase
 *  completion) — not part of the original localStorage API, but needed now
 *  that "push onto the array and save" isn't how a DB row gets created. */
export async function addDownload(record: {
  productId: string;
  productTitle: string;
  productAuthor: string;
  productType: "ebook" | "audiobook" | "video";
  price: number;
  purchasedAt: string;
  sessionId: string;
}): Promise<DownloadRecord> {
  return dbAddDownload({ data: record });
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

/** Returns the ids of the download rows that were flipped to "refunded", so
 *  callers (stripeCheckout.ts) can void the matching affiliate ledger rows. */
export async function markDownloadsRefunded(sessionId: string): Promise<string[]> {
  return dbMarkDownloadsRefunded({ data: sessionId });
}
