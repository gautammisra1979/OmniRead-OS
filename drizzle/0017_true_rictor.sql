CREATE TABLE "storefront_layout" (
	"id" text PRIMARY KEY NOT NULL,
	"active_layout" text DEFAULT 'magazine' NOT NULL,
	"featured_product_id" text
);
--> statement-breakpoint
CREATE TABLE "style_presets" (
	"id" text PRIMARY KEY NOT NULL,
	"border" text DEFAULT 'sharp' NOT NULL,
	"typography" text DEFAULT 'classic' NOT NULL,
	"announcement_enabled" boolean DEFAULT true NOT NULL,
	"announcement_text" text NOT NULL,
	"announcement_type" text DEFAULT 'shipping' NOT NULL,
	"announcement_dismissible" boolean DEFAULT true NOT NULL,
	"announcement_link_url" text DEFAULT '' NOT NULL,
	"announcement_link_text" text DEFAULT 'Learn More' NOT NULL,
	"announcement_shipping_threshold" double precision DEFAULT 50 NOT NULL,
	"announcement_shipping_message" text NOT NULL
);
