CREATE TABLE "refund_claims" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"download_id" uuid NOT NULL,
	"product_id" text NOT NULL,
	"product_title" text NOT NULL,
	"transaction_id" text NOT NULL,
	"reason" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	"refund_loyalty_points" integer DEFAULT 0 NOT NULL,
	"admin_notes" text
);
