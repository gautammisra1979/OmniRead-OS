CREATE TABLE "downloads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"product_id" text NOT NULL,
	"product_title" text NOT NULL,
	"product_author" text NOT NULL,
	"product_type" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"purchased_at" timestamp NOT NULL,
	"last_downloaded_at" timestamp,
	"download_count" integer DEFAULT 0 NOT NULL,
	"status" text DEFAULT 'active' NOT NULL
);
