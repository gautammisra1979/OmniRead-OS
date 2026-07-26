import { createServerFn } from "@tanstack/react-start";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "~/db";
import { downloads, type DownloadRow, type NewDownloadRow } from "~/db/schema";
import { getOrCreateOwnerId } from "~/lib/ownerId";

/**
 * Phase 3 (Step 26): DB-backed download ledger, replacing the localStorage
 * version. Rows are keyed by the anonymous ownerId cookie
 * (src/lib/ownerId.ts) rather than a real user_id — swap once Better Auth
 * lands. Flight Recorder was never wired into this module, so there's
 * nothing to remove there.
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
function demoRecords(ownerId: string): NewDownloadRow[] {
  const now = Date.now();
  const daysAgo = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000);

  return [
    {
      ownerId,
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
      ownerId,
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
      ownerId,
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
    const ownerId = getOrCreateOwnerId();
    const database = db();
    const rows = await database.select().from(downloads).where(eq(downloads.ownerId, ownerId));
    if (rows.length > 0) return rows.map(rowToRecord);

    // First visit for this owner — seed the demo records.
    const seeded = await database.insert(downloads).values(demoRecords(ownerId)).returning();
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
    const ownerId = getOrCreateOwnerId();
    const [row] = await db()
      .insert(downloads)
      .values({
        ownerId,
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
    const ownerId = getOrCreateOwnerId();
    const database = db();
    const rows = await database
      .select()
      .from(downloads)
      .where(and(eq(downloads.id, id), eq(downloads.ownerId, ownerId)));
    const row = rows[0];
    if (!row) return;
    await database
      .update(downloads)
      .set({ downloadCount: row.downloadCount + 1, lastDownloadedAt: new Date() })
      .where(eq(downloads.id, id));
  });

const dbMarkDownloadsRefunded = createServerFn({ method: "POST" })
  .validator((sessionId: string) => sessionId)
  .handler(async ({ data: sessionId }): Promise<void> => {
    const ownerId = getOrCreateOwnerId();
    await db()
      .update(downloads)
      .set({ status: "refunded" })
      .where(and(eq(downloads.ownerId, ownerId), eq(downloads.sessionId, sessionId)));
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

export async function markDownloadsRefunded(sessionId: string): Promise<void> {
  return dbMarkDownloadsRefunded({ data: sessionId });
}
