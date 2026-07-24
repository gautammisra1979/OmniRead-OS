CREATE TABLE "cart_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"product_id" text NOT NULL,
	"title" text NOT NULL,
	"author" text NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"type" text NOT NULL,
	"format" text NOT NULL,
	"cover_image" text,
	"quantity" integer DEFAULT 1 NOT NULL,
	"added_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cart_state" (
	"owner_id" text PRIMARY KEY NOT NULL,
	"last_activity" timestamp DEFAULT now() NOT NULL,
	"is_abandoned" boolean DEFAULT false NOT NULL,
	"abandoned_at" timestamp,
	"recovery_coupon" text,
	"recovery_discount" integer,
	"recovery_offered" boolean DEFAULT false NOT NULL,
	"recovery_redeemed" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "loyalty_config" (
	"owner_id" text NOT NULL,
	"status" text NOT NULL,
	"tiers" jsonb NOT NULL,
	"points_per_purchase" integer DEFAULT 10 NOT NULL,
	"extra_credits_multiplier" numeric(5, 2) DEFAULT '1' NOT NULL,
	"conversion_rate" integer DEFAULT 100 NOT NULL,
	"minimum_redeem" integer DEFAULT 50 NOT NULL,
	CONSTRAINT "loyalty_config_owner_id_status_pk" PRIMARY KEY("owner_id","status")
);
--> statement-breakpoint
CREATE TABLE "loyalty_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" text NOT NULL,
	"type" text NOT NULL,
	"points" integer NOT NULL,
	"description" text NOT NULL,
	"product_id" text,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet" (
	"owner_id" text PRIMARY KEY NOT NULL,
	"credits" numeric(10, 2) DEFAULT '50' NOT NULL,
	"total_purchased" numeric(10, 2) DEFAULT '50' NOT NULL,
	"total_consumed" numeric(10, 2) DEFAULT '0' NOT NULL,
	"refill_price" numeric(10, 2) DEFAULT '3.99' NOT NULL,
	"cost_per_1k" numeric(10, 4) DEFAULT '0.01' NOT NULL
);
