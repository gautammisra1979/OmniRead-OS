import {
  pgTable,
  text,
  doublePrecision,
  integer,
  boolean,
  timestamp,
  jsonb,
} from "drizzle-orm/pg-core";

/**
 * Phase 1 of Step 26 (Backend Migration): schema only.
 * Mirrors the current CatalogItem interface in src/data/catalog.ts, with one
 * deliberate exception — coverImage and mediaFile.dataUrl (base64 data URLs)
 * become nullable `cover_url` / `media_url` text columns, to be populated from
 * Vercel Blob in Phase 2. Nothing here is wired into the running app yet.
 *
 * `type` and `status` are plain text (not Postgres enums) on purpose: CSV
 * import is still being iterated on, and DB-level enums reject bad rows with
 * an opaque Postgres error instead of a friendly app-level validation
 * message. TypeScript's union types already give compile-time safety in the
 * app layer; revisit a DB-level enum only once these value sets are stable
 * (e.g. ahead of commercial launch), since narrowing/renaming enum values
 * later is more disruptive than tightening a text column.
 */

export const catalogItems = pgTable("catalog_items", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  price: doublePrecision("price").notNull(),
  type: text("type").notNull(), // "ebook" | "audiobook" | "video"
  format: text("format").notNull(),
  description: text("description").notNull(),

  // Replaces base64 coverImage — populated from Vercel Blob in Phase 2.
  coverUrl: text("cover_url"),

  // Replaces mediaFile: { name, dataUrl }. dataUrl -> media_url (Blob URL,
  // Phase 2); name is preserved separately since it isn't base64 payload.
  mediaName: text("media_name"),
  mediaUrl: text("media_url"),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),

  // Lifecycle status; defaults to "live" if not set, matching current logic.
  status: text("status").default("live"), // "live" | "coming-soon" | "retired"

  // Star ratings (from CSV import or manual).
  rating: doublePrecision("rating"),
  reviewCount: integer("review_count"),

  // Catalog access control.
  allowLibrarian: boolean("allow_librarian").default(true),
  allowChallenge: boolean("allow_challenge").default(true),

  // Quiz concierge tags.
  quizMood: text("quiz_mood").array(),
  quizFormat: text("quiz_format").array(),
  quizHook: text("quiz_hook").array(),
  quizPace: text("quiz_pace").array(),

  // Loyalty rewards bonus.
  promoFlatBonus: doublePrecision("promo_flat_bonus"),

  // Promotions override: { hasOverride, overrideType, overrideValue }.
  promoOverride: jsonb("promo_override").$type<{
    hasOverride: boolean;
    overrideType: "percentage" | "flat" | "fixed";
    overrideValue: number;
  }>(),
});

export type CatalogItemRow = typeof catalogItems.$inferSelect;
export type NewCatalogItemRow = typeof catalogItems.$inferInsert;
