import { createServerFn } from "@tanstack/react-start";
import { count, eq, max, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { sql } from "~/db";
import {
  catalogItems,
  storefrontLayout,
  stylePresets,
  type CatalogItemRow,
  type StorefrontLayoutRow,
  type StylePresetsRow,
  type NewStylePresetsRow,
} from "~/db/schema";
import type { CatalogItem, CatalogStatus } from "~/data/catalog";
import type { LayoutType } from "~/data/layoutMatrix";
import { DEFAULT_PRESETS, DEFAULT_ANNOUNCEMENT, type BorderPreset, type TypographyPreset, type AnnouncementConfig } from "~/data/stylePresets";
import { requireAdmin } from "~/lib/requireAdmin";

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

/**
 * Cheap change-signal for pollers (ProductGrid/ComingSoonSection): a single
 * aggregate query (row count + max updatedAt) instead of a full catalog
 * fetch, so a 2-second poll can detect "nothing changed" without paying for
 * getAllProducts()'s full read/join/discount-calc chain on every tick.
 */
export const getCatalogSignature = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ count: number; maxUpdatedAt: string | null }> => {
    const [row] = await db()
      .select({
        count: count(),
        maxUpdatedAt: max(catalogItems.updatedAt),
      })
      .from(catalogItems);
    return {
      count: row?.count ?? 0,
      maxUpdatedAt: row?.maxUpdatedAt ? new Date(row.maxUpdatedAt).toISOString() : null,
    };
  },
);

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
    await requireAdmin();
    const now = new Date();
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
        createdAt: now,
        updatedAt: now,
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
    await requireAdmin();
    await db().delete(catalogItems).where(eq(catalogItems.id, id));
  });

export const updateCatalogStatus = createServerFn({ method: "POST" })
  .validator((input: { id: string; status: CatalogStatus }) => input)
  .handler(async ({ data }): Promise<void> => {
    await requireAdmin();
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
    await requireAdmin();
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

export const updateCatalogAccess = createServerFn({ method: "POST" })
  .validator(
    (input: { id: string; allowLibrarian: boolean; allowChallenge: boolean }) => input,
  )
  .handler(async ({ data }): Promise<void> => {
    await requireAdmin();
    await db()
      .update(catalogItems)
      .set({
        allowLibrarian: data.allowLibrarian,
        allowChallenge: data.allowChallenge,
      })
      .where(eq(catalogItems.id, data.id));
  });

/** Field-scoped update for the bulk promo-override editor (PromotionsAdminSection)
 *  — writes only promoOverride, mirroring updateCatalogAccess, so a bulk save
 *  can't clobber concurrent admin edits to other fields on the same rows. */
export const updateCatalogPromoOverride = createServerFn({ method: "POST" })
  .validator(
    (input: {
      id: string;
      promoOverride: {
        hasOverride: boolean;
        overrideType: "percentage" | "flat" | "fixed";
        overrideValue: number;
      } | null;
    }) => input,
  )
  .handler(async ({ data }): Promise<void> => {
    await requireAdmin();
    await db()
      .update(catalogItems)
      .set({ promoOverride: data.promoOverride })
      .where(eq(catalogItems.id, data.id));
  });

/* ─── Storefront Layout (single global row, same shape as promoSettings/licenseSettings) ─── */

const STOREFRONT_LAYOUT_ID = "global";

export interface StorefrontLayoutSettings {
  activeLayout: LayoutType;
  featuredProductId: string | null;
}

function rowToStorefrontLayout(row: StorefrontLayoutRow): StorefrontLayoutSettings {
  return {
    activeLayout: row.activeLayout as LayoutType,
    featuredProductId: row.featuredProductId,
  };
}

export const getStorefrontLayout = createServerFn({ method: "GET" }).handler(
  async (): Promise<StorefrontLayoutSettings> => {
    const database = db();
    const rows = await database
      .select()
      .from(storefrontLayout)
      .where(eq(storefrontLayout.id, STOREFRONT_LAYOUT_ID));
    if (rows[0]) return rowToStorefrontLayout(rows[0]);

    await database
      .insert(storefrontLayout)
      .values({ id: STOREFRONT_LAYOUT_ID })
      .onConflictDoNothing();
    return { activeLayout: "magazine", featuredProductId: null };
  },
);

export const updateStorefrontLayout = createServerFn({ method: "POST" })
  .validator(
    (input: { activeLayout?: LayoutType; featuredProductId?: string | null }) => input,
  )
  .handler(async ({ data }): Promise<void> => {
    await requireAdmin();
    const set: Partial<StorefrontLayoutRow> = {};
    if (data.activeLayout !== undefined) set.activeLayout = data.activeLayout;
    if (data.featuredProductId !== undefined) set.featuredProductId = data.featuredProductId;
    if (Object.keys(set).length === 0) return;

    await db()
      .insert(storefrontLayout)
      .values({ id: STOREFRONT_LAYOUT_ID, ...set })
      .onConflictDoUpdate({ target: storefrontLayout.id, set });
  });

/* ─── Style Presets + Announcement Bar (single global row — they already
 *     share one file/one admin UI component, so they share one table too) ─── */

const STYLE_PRESETS_ID = "global";

export interface StylePresetsBundle {
  border: BorderPreset;
  typography: TypographyPreset;
  announcement: AnnouncementConfig;
}

function rowToStylePresetsBundle(row: StylePresetsRow): StylePresetsBundle {
  return {
    border: row.border as BorderPreset,
    typography: row.typography as TypographyPreset,
    announcement: {
      enabled: row.announcementEnabled,
      text: row.announcementText,
      type: row.announcementType as AnnouncementConfig["type"],
      dismissible: row.announcementDismissible,
      linkUrl: row.announcementLinkUrl,
      linkText: row.announcementLinkText,
      shippingThreshold: row.announcementShippingThreshold,
      shippingMessage: row.announcementShippingMessage,
    },
  };
}

export const getStylePresets = createServerFn({ method: "GET" }).handler(
  async (): Promise<StylePresetsBundle> => {
    const database = db();
    const rows = await database
      .select()
      .from(stylePresets)
      .where(eq(stylePresets.id, STYLE_PRESETS_ID));
    if (rows[0]) return rowToStylePresetsBundle(rows[0]);

    await database
      .insert(stylePresets)
      .values({
        id: STYLE_PRESETS_ID,
        announcementText: DEFAULT_ANNOUNCEMENT.text,
        announcementShippingMessage: DEFAULT_ANNOUNCEMENT.shippingMessage,
      })
      .onConflictDoNothing();
    return {
      border: DEFAULT_PRESETS.border,
      typography: DEFAULT_PRESETS.typography,
      announcement: { ...DEFAULT_ANNOUNCEMENT },
    };
  },
);

export const updateStylePresets = createServerFn({ method: "POST" })
  .validator(
    (input: {
      border?: BorderPreset;
      typography?: TypographyPreset;
      announcement?: AnnouncementConfig;
    }) => input,
  )
  .handler(async ({ data }): Promise<void> => {
    await requireAdmin();
    const set: Partial<NewStylePresetsRow> = {};
    if (data.border !== undefined) set.border = data.border;
    if (data.typography !== undefined) set.typography = data.typography;
    if (data.announcement) {
      set.announcementEnabled = data.announcement.enabled;
      set.announcementText = data.announcement.text;
      set.announcementType = data.announcement.type;
      set.announcementDismissible = data.announcement.dismissible;
      set.announcementLinkUrl = data.announcement.linkUrl;
      set.announcementLinkText = data.announcement.linkText;
      set.announcementShippingThreshold = data.announcement.shippingThreshold;
      set.announcementShippingMessage = data.announcement.shippingMessage;
    }
    if (Object.keys(set).length === 0) return;

    await db()
      .insert(stylePresets)
      .values({
        id: STYLE_PRESETS_ID,
        announcementText: DEFAULT_ANNOUNCEMENT.text,
        announcementShippingMessage: DEFAULT_ANNOUNCEMENT.shippingMessage,
        ...set,
      })
      .onConflictDoUpdate({ target: stylePresets.id, set });
  });
