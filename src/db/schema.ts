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
import { user } from "~/db/auth-schema";

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

  // Cheap change-signal for polling clients (ProductGrid/ComingSoonSection):
  // bumped on every write so pollers can detect "nothing changed" without a
  // full getAllProducts() round-trip. See getCatalogSignature() in queries.ts.
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),

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
 * `userId`, a real Better Auth `user.id` — every visitor (guest or
 * logged-in) has one via the `anonymous` plugin (see src/lib/auth.ts).
 */

export const cartItems = pgTable("cart_items", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
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
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
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
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
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
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
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
    pk: primaryKey({ columns: [table.userId, table.status] }),
  }),
);

export type LoyaltyConfigRow = typeof loyaltyConfig.$inferSelect;
export type NewLoyaltyConfigRow = typeof loyaltyConfig.$inferInsert;

export const loyaltyLedger = pgTable("loyalty_ledger", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
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
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
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
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
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
 * admin — not per-visitor state — so it deliberately has no `userId`
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

/**
 * Single global, admin-managed promotions settings row (Step 26). Like
 * knowledgeRows, this is not per-visitor state, so no userId column — the
 * app always reads/writes the one row keyed by the fixed "global" id.
 */
export const promoSettings = pgTable("promo_settings", {
  id: text("id").primaryKey(),
  isPromoModuleEnabled: boolean("is_promo_module_enabled").notNull().default(false),
  globalDiscountType: text("global_discount_type").notNull().default("percentage"), // percentage | flat | coupon
  globalDiscountValue: doublePrecision("global_discount_value").notNull().default(20),
  activeCouponCode: text("active_coupon_code").notNull().default("SAVE20"),
  announcementText: text("announcement_text").notNull().default("🎉 20% off storewide!"),
  couponFormatRestriction: text("coupon_format_restriction").default("all"), // all | ebook | audiobook | video
});

export type PromoSettingsRow = typeof promoSettings.$inferSelect;
export type NewPromoSettingsRow = typeof promoSettings.$inferInsert;

/**
 * Public discussion comments on product pages (Step 26). Like knowledgeRows
 * and promoSettings, this is global content — not per-visitor state — so
 * there is deliberately no userId column. `author` is free text since
 * comments aren't scoped to a poster's identity.
 */
export const comments = pgTable("comments", {
  id: text("id").primaryKey(),
  productId: text("product_id").notNull(),
  parentId: text("parent_id"), // null = top-level comment
  author: text("author").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type CommentRow = typeof comments.$inferSelect;
export type NewCommentRow = typeof comments.$inferInsert;

/**
 * Single global, admin-managed license tier setting (Step 26 trust-boundary
 * decision). Like promoSettings, this is not per-visitor state, so no
 * userId column — the app always reads/writes the one row keyed by the
 * fixed "global" id. Self-hosted buyers can edit this row directly; that is
 * an accepted trade-off, not a bug — see src/data/licensing.ts.
 */
export const licenseSettings = pgTable("license_settings", {
  id: text("id").primaryKey(),
  tier: text("tier").notNull().default("standard"), // "standard" | "premium"
});

export type LicenseSettingsRow = typeof licenseSettings.$inferSelect;
export type NewLicenseSettingsRow = typeof licenseSettings.$inferInsert;

/**
 * Single global admin-credentials row (legacy passcode path — see
 * src/lib/requireAdmin.ts). Same shape as promoSettings/licenseSettings — no
 * userId, one row keyed by the fixed "global" id.
 *
 * `passcodeHash` is a verify-only argon2id hash — never reversible.
 * `recoveryEncrypted` deliberately is NOT a hash: the recovery phrase must
 * stay re-viewable from the admin panel after initial setup (a real
 * requirement, not an oversight), so it's AES-GCM encrypted at rest using a
 * server-only key (`RECOVERY_ENCRYPTION_KEY`, see src/lib/recoveryCrypto.ts)
 * instead of stored in plaintext. See src/data/adminRecovery.ts and
 * src/lib/requireAdmin.ts.
 */
export const adminAuth = pgTable("admin_auth", {
  id: text("id").primaryKey(), // fixed "global" row
  email: text("email"),
  passcodeHash: text("passcode_hash"),
  recoveryEncrypted: text("recovery_encrypted"),
});

export type AdminAuthRow = typeof adminAuth.$inferSelect;
export type NewAdminAuthRow = typeof adminAuth.$inferInsert;

/**
 * Tier A (real affiliate backend): six new tables replacing the pieces of
 * src/data/affiliate.ts's localStorage model that have no server-side
 * equivalent yet. src/data/affiliate.ts and its UI consumers are untouched —
 * this is net-new, additive infrastructure for a future Tier B rewire.
 */

export const affiliateProfiles = pgTable("affiliate_profiles", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id").notNull().unique().references(() => user.id, { onDelete: "cascade" }),
  handle: text("handle").notNull().unique(),
  brandName: text("brand_name").notNull(),
  paymentMethod: text("payment_method").notNull().default("paypal"), // paypal | venmo | crypto
  paymentDetail: text("payment_detail").notNull().default(""),
  payoutPreference: text("payout_preference").notNull().default("cash"), // cash | loyalty_credit — affiliate's own standing choice, changeable any time; only executed once a given ledger row clears its hold period
  registeredAt: timestamp("registered_at", { withTimezone: true }).notNull().defaultNow(),
});
export type AffiliateProfileRow = typeof affiliateProfiles.$inferSelect;
export type NewAffiliateProfileRow = typeof affiliateProfiles.$inferInsert;

// One active referral per visitor, last-click-wins. Replaces the old
// localStorage ActiveReferrer — keyed by the visitor's real Better Auth
// user_id (anonymous or logged in) rather than a browser-local value, so it
// survives the visitor converting to a real account (see mergeAnonymousUser.ts change below).
export const affiliateReferrals = pgTable("affiliate_referrals", {
  userId: text("user_id").primaryKey().references(() => user.id, { onDelete: "cascade" }),
  affiliateId: uuid("affiliate_id").notNull().references(() => affiliateProfiles.id, { onDelete: "cascade" }),
  referredAt: timestamp("referred_at", { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
});
export type AffiliateReferralRow = typeof affiliateReferrals.$inferSelect;
export type NewAffiliateReferralRow = typeof affiliateReferrals.$inferInsert;

export const affiliateClickEvents = pgTable("affiliate_click_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  affiliateId: uuid("affiliate_id").notNull().references(() => affiliateProfiles.id, { onDelete: "cascade" }),
  visitorUserId: text("visitor_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  sourcePage: text("source_page").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export type AffiliateClickEventRow = typeof affiliateClickEvents.$inferSelect;
export type NewAffiliateClickEventRow = typeof affiliateClickEvents.$inferInsert;

// status: pending | paid | converted | voided. There is deliberately no
// stored "approved" state — whether a pending row is past its hold period
// is computed at read/resolve time (see affiliateProgram.ts), not stored,
// since this app has no scheduled-job infrastructure to flip it on a timer.
export const affiliateLedger = pgTable("affiliate_ledger", {
  id: uuid("id").defaultRandom().primaryKey(),
  affiliateId: uuid("affiliate_id").notNull().references(() => affiliateProfiles.id, { onDelete: "cascade" }),
  downloadId: uuid("download_id").notNull().references(() => downloads.id, { onDelete: "cascade" }),
  buyerUserId: text("buyer_user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  productTitle: text("product_title").notNull(),
  purchaseValue: numeric("purchase_value", { precision: 10, scale: 2 }).notNull(),
  commissionSlice: numeric("commission_slice", { precision: 10, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  payoutId: uuid("payout_id").references(() => affiliatePayouts.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});
export type AffiliateLedgerRow = typeof affiliateLedger.$inferSelect;
export type NewAffiliateLedgerRow = typeof affiliateLedger.$inferInsert;

// One row per settlement batch — replaces the old blunt "mark all approved
// as paid" flip with a real, storeowner-reviewable payout record.
export const affiliatePayouts = pgTable("affiliate_payouts", {
  id: uuid("id").defaultRandom().primaryKey(),
  affiliateId: uuid("affiliate_id").notNull().references(() => affiliateProfiles.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  referenceNote: text("reference_note"),
  settledAt: timestamp("settled_at", { withTimezone: true }).notNull().defaultNow(),
});
export type AffiliatePayoutRow = typeof affiliatePayouts.$inferSelect;
export type NewAffiliatePayoutRow = typeof affiliatePayouts.$inferInsert;

// Single global settings row — same pattern as promoSettings/licenseSettings.
export const affiliateSettings = pgTable("affiliate_settings", {
  id: text("id").primaryKey(), // fixed "global" row
  commissionRate: doublePrecision("commission_rate").notNull().default(0.1),
  attributionWindowDays: integer("attribution_window_days").notNull().default(30),
  holdPeriodDays: integer("hold_period_days").notNull().default(30),
});
export type AffiliateSettingsRow = typeof affiliateSettings.$inferSelect;
export type NewAffiliateSettingsRow = typeof affiliateSettings.$inferInsert;
