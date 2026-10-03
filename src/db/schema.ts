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
  uniqueIndex,
  unique,
  index,
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
});

export type WalletRow = typeof wallet.$inferSelect;
export type NewWalletRow = typeof wallet.$inferInsert;

export const creditSettings = pgTable("credit_settings", {
  id: text("id").primaryKey(), // fixed "global" row
  costPer1K: doublePrecision("cost_per_1k").notNull().default(0.01),
});
export type CreditSettingsRow = typeof creditSettings.$inferSelect;
export type NewCreditSettingsRow = typeof creditSettings.$inferInsert;

export const loyaltyConfig = pgTable(
  "loyalty_config",
  {
    id: text("id").notNull().default("global"),
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
    pk: primaryKey({ columns: [table.id, table.status] }),
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

export const downloads = pgTable(
  "downloads",
  {
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
    // Populated by the Stripe webhook (src/routes/api/stripe/webhook.ts);
    // consumed by the separate Real Refunds work. Added now rather than in
    // a second migration on this table later, same reasoning as other
    // additive fields on this row (e.g. sessionId itself).
    stripePaymentIntentId: text("stripe_payment_intent_id"),
  },
  (table) => ({
    // The real fix for the checkout duplicate-insert race: the webhook
    // inserts with onConflictDoNothing() against this index instead of a
    // read-then-write existence check, so a redelivered Stripe webhook
    // event is safe by construction.
    sessionProductUnique: uniqueIndex("downloads_session_id_product_id_unique").on(
      table.sessionId,
      table.productId,
    ),
  }),
);

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
 * Single global, admin-managed storefront layout setting. Same shape as
 * promoSettings/licenseSettings — no userId, one row keyed by the fixed
 * "global" id. Replaces the old localStorage-only src/data/layoutMatrix.ts.
 */
export const storefrontLayout = pgTable("storefront_layout", {
  id: text("id").primaryKey(),
  activeLayout: text("active_layout").notNull().default("magazine"), // "classic" | "spotlight" | "magazine"
  featuredProductId: text("featured_product_id"),
});

export type StorefrontLayoutRow = typeof storefrontLayout.$inferSelect;
export type NewStorefrontLayoutRow = typeof storefrontLayout.$inferInsert;

/**
 * Single global, admin-managed store branding row. Same shape as
 * promoSettings/licenseSettings — no userId, one row keyed by the fixed
 * "global" id. Replaces the old localStorage-only branding config. The logo
 * itself lives in Vercel Blob (public covers store); only its URL is stored.
 */
export const brandingSettings = pgTable("branding_settings", {
  id: text("id").primaryKey(),
  storeName: text("store_name").notNull(),
  supportEmail: text("support_email").notNull().default(""),
  socialTwitter: text("social_twitter").notNull().default(""),
  socialInstagram: text("social_instagram").notNull().default(""),
  socialTiktok: text("social_tiktok").notNull().default(""),
  logoUrl: text("logo_url"),
});

export type BrandingSettingsRow = typeof brandingSettings.$inferSelect;
export type NewBrandingSettingsRow = typeof brandingSettings.$inferInsert;

/**
 * Single global, admin-managed store colour theme row. Same shape as
 * promoSettings/licenseSettings — no userId, one row keyed by the fixed
 * "global" id. Replaces the old localStorage-only active theme.
 */
export const themeSettings = pgTable("theme_settings", {
  id: text("id").primaryKey(),
  themeId: text("theme_id").notNull(),
  themeName: text("theme_name").notNull(),
  colorBg: text("color_bg").notNull(),
  colorSurface: text("color_surface").notNull(),
  colorNav: text("color_nav").notNull(),
  colorPrimary: text("color_primary").notNull(),
  colorText: text("color_text").notNull(),
  colorTextMuted: text("color_text_muted").notNull(),
  colorBorder: text("color_border").notNull(),
});

export type ThemeSettingsRow = typeof themeSettings.$inferSelect;
export type NewThemeSettingsRow = typeof themeSettings.$inferInsert;

/**
 * Single global, admin-managed style + announcement-bar settings row. Same
 * shape as promoSettings/licenseSettings — no userId, one row keyed by the
 * fixed "global" id. Replaces the old localStorage-only
 * src/data/stylePresets.ts. Border/typography presets and the announcement
 * bar config live in one table here, matching how they already share one
 * file and one admin UI component (StyleCustomizer.tsx) today.
 */
export const stylePresets = pgTable("style_presets", {
  id: text("id").primaryKey(),
  border: text("border").notNull().default("sharp"), // "sharp" | "rounded" | "elevated"
  typography: text("typography").notNull().default("classic"), // "modern" | "classic" | "minimal"
  announcementEnabled: boolean("announcement_enabled").notNull().default(true),
  announcementText: text("announcement_text").notNull(),
  announcementType: text("announcement_type").notNull().default("shipping"), // "info" | "sale" | "shipping" | "warning"
  announcementDismissible: boolean("announcement_dismissible").notNull().default(true),
  announcementLinkUrl: text("announcement_link_url").notNull().default(""),
  announcementLinkText: text("announcement_link_text").notNull().default("Learn More"),
  announcementShippingThreshold: doublePrecision("announcement_shipping_threshold").notNull().default(50),
  announcementShippingMessage: text("announcement_shipping_message").notNull(),
});

export type StylePresetsRow = typeof stylePresets.$inferSelect;
export type NewStylePresetsRow = typeof stylePresets.$inferInsert;

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

/**
 * Session 60: swappable transactional-email provider config. Single global,
 * admin-managed settings row — same pattern as affiliateSettings/promoSettings.
 * Each provider gets its own named columns (not a generic key-value blob) so
 * Resend/Postmark's single API key and SES's access-key/secret/region don't
 * have to be forced into the same field shape. Secret columns
 * (*ApiKeyEncrypted, sesSecretAccessKeyEncrypted) hold ciphertext produced by
 * src/lib/recoveryCrypto.ts's AES-GCM helpers, decrypted only inside the
 * adapter call path (src/lib/email/getProvider.ts) — dbGetEmailSettings
 * (src/data/emailSettings.ts) never returns these columns to the client.
 * sesAccessKeyId is not secret (it's an identifier, not a credential) and is
 * returned as-is.
 */
export const emailSettings = pgTable("email_settings", {
  id: text("id").primaryKey(), // fixed "global" row
  provider: text("provider").notNull().default("resend"), // "resend" | "postmark" | "ses"
  fromName: text("from_name").notNull().default(""),
  fromAddress: text("from_address").notNull().default(""),
  resendApiKeyEncrypted: text("resend_api_key_encrypted"),
  postmarkApiKeyEncrypted: text("postmark_api_key_encrypted"),
  sesAccessKeyId: text("ses_access_key_id"),
  sesSecretAccessKeyEncrypted: text("ses_secret_access_key_encrypted"),
  sesRegion: text("ses_region").notNull().default("us-east-1"),
});
export type EmailSettingsRow = typeof emailSettings.$inferSelect;
export type NewEmailSettingsRow = typeof emailSettings.$inferInsert;

/**
 * Session 60: failure log for sendEmail() (src/lib/email/sendEmail.ts), the
 * guard-rail wrapper future automatic call sites (password reset, magic-link,
 * Contact Us notification — none wired up yet) will use instead of calling a
 * provider adapter directly. One row per real-send failure in production;
 * same shape/style as affiliateClickEvents. No admin UI reads this yet
 * (deliberately deferred until a real automatic call site exists).
 */
export const emailSendFailures = pgTable("email_send_failures", {
  id: uuid("id").defaultRandom().primaryKey(),
  notificationType: text("notification_type").notNull(),
  recipient: text("recipient").notNull(),
  errorMessage: text("error_message").notNull(),
  provider: text("provider").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export type EmailSendFailureRow = typeof emailSendFailures.$inferSelect;
export type NewEmailSendFailureRow = typeof emailSendFailures.$inferInsert;

/**
 * Session 63: one shared fixed-window rate limiter for every server
 * endpoint that doesn't go through Better Auth's own handler (which has its
 * own rate_limit table — see auth-schema.ts). See src/lib/rateLimit.ts for
 * the atomic upsert this table backs.
 */
export const rateLimitHits = pgTable(
  "rate_limit_hits",
  {
    key: text("key").primaryKey(), // e.g. "admin-passcode:global" or "comment-post:203.0.113.4"
    count: integer("count").notNull().default(1),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    windowStartIdx: index("rate_limit_hits_window_start_idx").on(table.windowStart),
  }),
);

export type RateLimitHitRow = typeof rateLimitHits.$inferSelect;
export type NewRateLimitHitRow = typeof rateLimitHits.$inferInsert;

/**
 * Session 67: per-visitor media playback position, replacing the old
 * localStorage-only src/data/mediaProgress.ts. Composite primary key
 * (userId, productId) — one saved position per visitor per product.
 * `positionSeconds` (not `currentTime`): `current_time` is a reserved SQL
 * keyword in Postgres, and an unquoted `SELECT current_time` silently
 * returns the server clock instead of this column.
 */
export const mediaProgress = pgTable(
  "media_progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(),
    positionSeconds: doublePrecision("position_seconds").notNull(),
    duration: doublePrecision("duration").notNull(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.productId] }),
  }),
);

export type MediaProgressRow = typeof mediaProgress.$inferSelect;
export type NewMediaProgressRow = typeof mediaProgress.$inferInsert;

/**
 * Session 68: 30-Day Reading Challenge state, replacing the localStorage-only
 * src/data/progress.ts. Per-product progress: composite primary key
 * (userId, productId). `format` is plain text (ebook / audiobook / video),
 * validated server-side, not a Postgres enum.
 */
export const challengeProgress = pgTable(
  "challenge_progress",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(),
    productTitle: text("product_title").notNull(),
    format: text("format").notNull(),
    totalUnits: doublePrecision("total_units").notNull(),
    completedUnits: doublePrecision("completed_units").notNull(),
    day: integer("day").notNull(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.productId] }),
  }),
);

export type ChallengeProgressRow = typeof challengeProgress.$inferSelect;
export type NewChallengeProgressRow = typeof challengeProgress.$inferInsert;

/**
 * Session 68: one row per visitor — pacing config plus reminder interval.
 * A null `dayStart` means the visitor has no pacing config yet.
 */
export const challengeSettings = pgTable("challenge_settings", {
  userId: text("user_id")
    .primaryKey()
    .references(() => user.id, { onDelete: "cascade" }),
  dailyTarget: doublePrecision("daily_target"),
  dayStart: timestamp("day_start"),
  reminderIntervalDays: integer("reminder_interval_days").notNull().default(1),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export type ChallengeSettingsRow = typeof challengeSettings.$inferSelect;
export type NewChallengeSettingsRow = typeof challengeSettings.$inferInsert;

/**
 * Session 68: a visitor's own challenge reviews — one per visitor per product
 * (unique on userId + productId). Only ever read back by their author.
 */
export const challengeReviews = pgTable(
  "challenge_reviews",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productId: text("product_id").notNull(),
    productTitle: text("product_title").notNull(),
    rating: integer("rating").notNull(),
    keyTakeaway: text("key_takeaway").notNull(),
    reviewText: text("review_text").notNull(),
    actionPlan: text("action_plan").notNull(),
    pacingEval: text("pacing_eval").notNull(),
    isPrivate: boolean("is_private").notNull(),
    hasSpoiler: boolean("has_spoiler").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userProductUnique: unique("challenge_reviews_user_product_unique").on(
      table.userId,
      table.productId,
    ),
  }),
);

export type ChallengeReviewRow = typeof challengeReviews.$inferSelect;
export type NewChallengeReviewRow = typeof challengeReviews.$inferInsert;

// Session 75: one row per visitor per coming-soon product they asked to be
// notified about. Storage only; nothing sends notifications yet.
export const notifyRequests = pgTable(
  "notify_requests",
  {
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => catalogItems.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.userId, table.productId] }),
  }),
);

export type NotifyRequestRow = typeof notifyRequests.$inferSelect;

/**
 * Admin-managed membership plans, one row per plan (plan-free, plan-basic, ...).
 * Seeded from DEFAULT_PLANS on first read. Only price, storage_limit and the
 * allow_* flags are editable from the admin page; rows are never added or
 * removed there. Replaces the old localStorage plans list.
 */
export const membershipPlans = pgTable("membership_plans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  tier: text("tier").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  features: jsonb("features").$type<string[]>().notNull(),
  allowLibrarian: boolean("allow_librarian").notNull().default(false),
  allowChallenge: boolean("allow_challenge").notNull().default(false),
  allowDownloads: boolean("allow_downloads").notNull().default(false),
  allowAffiliate: boolean("allow_affiliate").notNull().default(false),
  storageLimit: integer("storage_limit").notNull(), // MB
  sortOrder: integer("sort_order").notNull(),
});

export type MembershipPlanRow = typeof membershipPlans.$inferSelect;
export type NewMembershipPlanRow = typeof membershipPlans.$inferInsert;

/**
 * Single global, admin-managed disclaimer modal config. Same shape as
 * promoSettings/licenseSettings — no userId, one row keyed by the fixed
 * "global" id. Replaces the old localStorage-only disclaimer config.
 */
export const disclaimerSettings = pgTable("disclaimer_settings", {
  id: text("id").primaryKey(),
  enabled: boolean("enabled").notNull().default(false),
  title: text("title").notNull(),
  content: text("content").notNull(),
  acceptLabel: text("accept_label").notNull(),
  declineLabel: text("decline_label").notNull(),
  requireAcceptance: boolean("require_acceptance").notNull().default(true),
});

export type DisclaimerSettingsRow = typeof disclaimerSettings.$inferSelect;
export type NewDisclaimerSettingsRow = typeof disclaimerSettings.$inferInsert;

/**
 * Admin-managed info modals (header navigation links), one row per modal.
 * Ids are generated server-side. Replaces the old localStorage info modal list.
 */
export const infoModals = pgTable("info_modals", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  icon: text("icon").notNull(),
  linkLabel: text("link_label").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type InfoModalRow = typeof infoModals.$inferSelect;
export type NewInfoModalRow = typeof infoModals.$inferInsert;
