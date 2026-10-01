CREATE TABLE "disclaimer_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"accept_label" text NOT NULL,
	"decline_label" text NOT NULL,
	"require_acceptance" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "info_modals" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"icon" text NOT NULL,
	"link_label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "membership_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"tier" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"features" jsonb NOT NULL,
	"allow_librarian" boolean DEFAULT false NOT NULL,
	"allow_challenge" boolean DEFAULT false NOT NULL,
	"allow_downloads" boolean DEFAULT false NOT NULL,
	"allow_affiliate" boolean DEFAULT false NOT NULL,
	"storage_limit" integer NOT NULL,
	"sort_order" integer NOT NULL
);
