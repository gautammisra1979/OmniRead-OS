CREATE TABLE "promo_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"is_promo_module_enabled" boolean DEFAULT false NOT NULL,
	"global_discount_type" text DEFAULT 'percentage' NOT NULL,
	"global_discount_value" double precision DEFAULT 20 NOT NULL,
	"active_coupon_code" text DEFAULT 'SAVE20' NOT NULL,
	"announcement_text" text DEFAULT '🎉 20% off storewide!' NOT NULL,
	"coupon_format_restriction" text DEFAULT 'all'
);
