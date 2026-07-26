import {
  pgTable,
  text,
  doublePrecision,
  integer,
  boolean,
  timestamp,
  jsonb,
  uuid,
  numeric,
  primaryKey,
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

/**
 * Phase 2/3 (Step 26): cart, wallet, and loyalty tables. All keyed by
 * `ownerId` — a browser-scoped anonymous cookie ID from src/lib/ownerId.ts,
 * standing in for a real `user_id` until Better Auth is wired in.
 */

export const cartItems = pgTable("cart_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: text("owner_id").notNull(),
  productId: text("product_id").notNull(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  type: text("type").notNull(), // ebook | audiobook | video
  format: text("format").notNull(),
  coverImage: text("cover_image"),
  quantity: integer("quantity").notNull().default(1),
  addedAt: timestamp("added_at").notNull().defaultNow(),
});

export const cartState = pgTable("cart_state", {
  ownerId: text("owner_id").primaryKey(),
  lastActivity: timestamp("last_activity").notNull().defaultNow(),
  isAbandoned: boolean("is_abandoned").notNull().default(false),
  abandonedAt: timestamp("abandoned_at"),
  recoveryCoupon: text("recovery_coupon"),
  recoveryDiscount: integer("recovery_discount"),
  recoveryOffered: boolean("recovery_offered").notNull().default(false),
  recoveryRedeemed: boolean("recovery_redeemed").notNull().default(false),
});

export type CartItemRow = typeof cartItems.$inferSelect;
export type NewCartItemRow = typeof cartItems.$inferInsert;
export type CartStateRow = typeof cartState.$inferSelect;
export type NewCartStateRow = typeof cartState.$inferInsert;

export const wallet = pgTable("wallet", {
  ownerId: text("owner_id").primaryKey(),
  credits: numeric("credits", { precision: 10, scale: 2 }).notNull().default("50"),
  totalPurchased: numeric("total_purchased", { precision: 10, scale: 2 })
    .notNull()
    .default("50"),
  totalConsumed: numeric("total_consumed", { precision: 10, scale: 2 })
    .notNull()
    .default("0"),
  refillPrice: numeric("refill_price", { precision: 10, scale: 2 })
    .notNull()
    .default("3.99"),
  costPer1K: numeric("cost_per_1k", { precision: 10, scale: 4 })
    .notNull()
    .default("0.01"),
});

export type WalletRow = typeof wallet.$inferSelect;
export type NewWalletRow = typeof wallet.$inferInsert;

export const loyaltyConfig = pgTable(
  "loyalty_config",
  {
    ownerId: text("owner_id").notNull(),
    status: text("status").notNull(), // 'draft' | 'published'
    tiers: jsonb("tiers")
      .notNull()
      .$type<Array<{ name: string; pointsRequired: number; multiplier: number }>>(),
    pointsPerPurchase: integer("points_per_purchase").notNull().default(10),
    extraCreditsMultiplier: numeric("extra_credits_multiplier", {
      precision: 5,
      scale: 2,
    })
      .notNull()
      .default("1"),
    conversionRate: integer("conversion_rate").notNull().default(100),
    minimumRedeem: integer("minimum_redeem").notNull().default(50),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.ownerId, table.status] }),
  }),
);

export type LoyaltyConfigRow = typeof loyaltyConfig.$inferSelect;
export type NewLoyaltyConfigRow = typeof loyaltyConfig.$inferInsert;

export const loyaltyLedger = pgTable("loyalty_ledger", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: text("owner_id").notNull(),
  type: text("type").notNull(), // earned | redeemed | bonus
  points: integer("points").notNull(),
  description: text("description").notNull(),
  productId: text("product_id"),
  timestamp: timestamp("timestamp").notNull().defaultNow(),
});

export type LoyaltyLedgerRow = typeof loyaltyLedger.$inferSelect;
export type NewLoyaltyLedgerRow = typeof loyaltyLedger.$inferInsert;

export const downloads = pgTable("downloads", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: text("owner_id").notNull(),
  productId: text("product_id").notNull(),
  productTitle: text("product_title").notNull(),
  productAuthor: text("product_author").notNull(),
  productType: text("product_type").notNull(), // ebook | audiobook | video
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  purchasedAt: timestamp("purchased_at").notNull(),
  lastDownloadedAt: timestamp("last_downloaded_at"),
  downloadCount: integer("download_count").notNull().default(0),
  status: text("status").notNull().default("active"), // active | refunded
  sessionId: text("session_id"),
});

export type DownloadRow = typeof downloads.$inferSelect;
export type NewDownloadRow = typeof downloads.$inferInsert;

export const refundClaims = pgTable("refund_claims", {
  id: uuid("id").defaultRandom().primaryKey(),
  ownerId: text("owner_id").notNull(),
  downloadId: uuid("download_id").notNull(),
  productId: text("product_id").notNull(),
  productTitle: text("product_title").notNull(),
  transactionId: text("transaction_id").notNull(), // real Stripe sessionId now
  reason: text("reason").notNull(),
  status: text("status").notNull().default("pending"), // pending | approved | rejected
  requestedAt: timestamp("requested_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  refundLoyaltyPoints: integer("refund_loyalty_points").notNull().default(0),
  adminNotes: text("admin_notes"),
});

export type RefundClaimRow = typeof refundClaims.$inferSelect;
export type NewRefundClaimRow = typeof refundClaims.$inferInsert;

/**
 * AI Librarian knowledge base source material, keyed to a `book_id`. Unlike
 * the tables above, this is global catalog content managed by the store
 * admin — not per-visitor state — so it deliberately has no `ownerId`
 * column, matching how `catalogItems` is treated.
 */
export const knowledgeRows = pgTable("knowledge_rows", {
  id: text("id").primaryKey(),
  bookId: text("book_id").notNull(),
  knowledgeType: text("knowledge_type").notNull(), // theme | timestamp_note | spoiler_shield_qa | cross_sell_hook
  markerReference: text("marker_reference").notNull(),
  contentBody: text("content_body").notNull(),
});

export type KnowledgeRowRow = typeof knowledgeRows.$inferSelect;
export type NewKnowledgeRowRow = typeof knowledgeRows.$inferInsert;
