import { createServerFn } from "@tanstack/react-start";
import { eq, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "~/db";
import { catalogItems, type CatalogItemRow } from "~/db/schema";
import type { CatalogItem, CatalogStatus } from "~/data/catalog";

/**
 * Phase 2 (Step 26), first slice: async query functions backed by Drizzle +
 * Neon, replacing the synchronous localStorage functions in
 * src/data/catalog.ts. These are server functions (createServerFn) — safe to
 * import and call from client components; TanStack Start compiles them into
 * an RPC call under the hood.
 *
 * TWO DELIBERATE GAPS, both flagged for review rather than silently patched
 * over — see the session notes for the discussion:
 *
 * 1. coverImage / mediaFile.dataUrl (base64) have no home in the new schema
 *    — only cover_url / media_name / media_url (Vercel Blob) exist. That
 *    means createCatalogItem below CANNOT accept base64 payloads; it takes
 *    coverUrl/mediaUrl directly. Until Blob upload is wired (Phase 2, item
 *    3, not started), there is no working "publish with a cover/media file"
 *    path — the CatalogDashboard POC deliberately leaves that button alone
 *    rather than wiring it to something that would silently drop the file.
 *
 * 2. saveCatalogItem (the old two-step "build then persist" call) has been
 *    folded into createCatalogItem — one DB insert IS the create. Call
 *    sites that used to call createCatalogItem() then saveCatalogItem()
 *    need to collapse to a single createCatalogItem() call.
 *
 * NOT carried over: the flightRecorder appendTransaction() calls that used
 * to fire on every catalog mutation. Those are gated on
 * `typeof window !== "undefined"`, which is false inside a server function
 * handler — so they'd silently no-op here, not actually log anything. That's
 * a real behavior change (catalog mutations stop appearing in the Flight
 * Recorder log) that deserves its own decision, not a silent drop. Flagging
 * rather than deciding.
 */

function db() {
  return drizzle(sql());
}

function generateId(): string {
  return `catalog-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function rowToCatalogItem(row: CatalogItemRow): CatalogItem {
  return {
    id: row.id,
    title: row.title,
    author: row.author,
    price: row.price,
    type: row.type as CatalogItem["type"],
    format: row.format,
    description: row.description,
    // Blob wiring (Phase 2 item 3) not done yet — these are null until then.
    coverImage: row.coverUrl,
    mediaFile: { name: row.mediaName ?? "", dataUrl: row.mediaUrl },
    createdAt: row.createdAt.toISOString(),
    status: (row.status ?? "live") as CatalogStatus,
    rating: row.rating ?? undefined,
    reviewCount: row.reviewCount ?? undefined,
    allowLibrarian: row.allowLibrarian ?? undefined,
    allowChallenge: row.allowChallenge ?? undefined,
    quizMood: row.quizMood ?? undefined,
    quizFormat: row.quizFormat ?? undefined,
    quizHook: row.quizHook ?? undefined,
    quizPace: row.quizPace ?? undefined,
    promoFlatBonus: row.promoFlatBonus ?? undefined,
    promoOverride: row.promoOverride ?? undefined,
  };
}

/* ─── Reads ─── */

export const getCatalogItems = createServerFn({ method: "GET" }).handler(
  async (): Promise<CatalogItem[]> => {
    const rows = await db().select().from(catalogItems);
    return rows.map(rowToCatalogItem);
  },
);

export const getCatalogItemById = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }): Promise<CatalogItem | null> => {
    const rows = await db()
      .select()
      .from(catalogItems)
      .where(eq(catalogItems.id, id));
    return rows[0] ? rowToCatalogItem(rows[0]) : null;
  });

/** Excludes retired items. Original code defined getActiveCatalogItems with
 *  an identical filter under a separate name — preserved as an alias below
 *  rather than a second round-trip, since the two were never observed to
 *  diverge. Flag if that's wrong. */
export const getLiveCatalogItems = createServerFn({ method: "GET" }).handler(
  async (): Promise<CatalogItem[]> => {
    const rows = await db()
      .select()
      .from(catalogItems)
      .where(ne(catalogItems.status, "retired"));
    return rows.map(rowToCatalogItem);
  },
);

export const getActiveCatalogItems = getLiveCatalogItems;

export const getComingSoonCatalogItems = createServerFn({
  method: "GET",
}).handler(async (): Promise<CatalogItem[]> => {
  const rows = await db()
    .select()
    .from(catalogItems)
    .where(eq(catalogItems.status, "coming-soon"));
  return rows.map(rowToCatalogItem);
});

/* ─── Writes ─── */

export const createCatalogItem = createServerFn({ method: "POST" })
  .validator(
    (input: {
      title: string;
      author: string;
      price: number;
      type: "ebook" | "audiobook" | "video";
      format: string;
      description: string;
      coverUrl?: string | null;
      mediaName?: string | null;
      mediaUrl?: string | null;
      status?: CatalogStatus;
      rating?: number;
      reviewCount?: number;
      quizMood?: string[];
      quizFormat?: string[];
      quizHook?: string[];
      quizPace?: string[];
    }) => input,
  )
  .handler(async ({ data }): Promise<CatalogItem> => {
    const [row] = await db()
      .insert(catalogItems)
      .values({
        id: generateId(),
        title: data.title,
        author: data.author,
        price: data.price,
        type: data.type,
        format: data.format,
        description: data.description,
        coverUrl: data.coverUrl ?? null,
        mediaName: data.mediaName ?? null,
        mediaUrl: data.mediaUrl ?? null,
        status: data.status ?? "live",
        rating: data.rating,
        reviewCount: data.reviewCount,
        quizMood: data.quizMood,
        quizFormat: data.quizFormat,
        quizHook: data.quizHook,
        quizPace: data.quizPace,
      })
      .returning();
    return rowToCatalogItem(row);
  });

export const deleteCatalogItem = createServerFn({ method: "POST" })
  .validator((id: string) => id)
  .handler(async ({ data: id }): Promise<void> => {
    await db().delete(catalogItems).where(eq(catalogItems.id, id));
  });

export const updateCatalogStatus = createServerFn({ method: "POST" })
  .validator((input: { id: string; status: CatalogStatus }) => input)
  .handler(async ({ data }): Promise<void> => {
    await db()
      .update(catalogItems)
      .set({ status: data.status })
      .where(eq(catalogItems.id, data.id));
  });

export const updateCatalogRating = createServerFn({ method: "POST" })
  .validator(
    (input: { id: string; rating: number; reviewCount?: number }) => input,
  )
  .handler(async ({ data }): Promise<void> => {
    const clamped = Math.max(0, Math.min(5, data.rating));
    await db()
      .update(catalogItems)
      .set({
        rating: clamped,
        ...(data.reviewCount !== undefined
          ? { reviewCount: data.reviewCount }
          : {}),
      })
      .where(eq(catalogItems.id, data.id));
  });
