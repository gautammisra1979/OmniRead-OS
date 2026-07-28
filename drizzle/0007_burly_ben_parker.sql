CREATE TABLE "comments" (
	"id" text PRIMARY KEY NOT NULL,
	"product_id" text NOT NULL,
	"parent_id" text,
	"author" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
