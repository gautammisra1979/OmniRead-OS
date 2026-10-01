CREATE TABLE "branding_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"store_name" text NOT NULL,
	"support_email" text DEFAULT '' NOT NULL,
	"social_twitter" text DEFAULT '' NOT NULL,
	"social_instagram" text DEFAULT '' NOT NULL,
	"social_tiktok" text DEFAULT '' NOT NULL,
	"logo_url" text
);
--> statement-breakpoint
CREATE TABLE "theme_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"theme_id" text NOT NULL,
	"theme_name" text NOT NULL,
	"color_bg" text NOT NULL,
	"color_surface" text NOT NULL,
	"color_nav" text NOT NULL,
	"color_primary" text NOT NULL,
	"color_text" text NOT NULL,
	"color_text_muted" text NOT NULL,
	"color_border" text NOT NULL
);
