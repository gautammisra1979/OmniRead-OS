ALTER TABLE "cart_items" ALTER COLUMN "added_at" SET DATA TYPE timestamp with time zone USING "added_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "cart_items" ALTER COLUMN "added_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "cart_state" ALTER COLUMN "last_activity" SET DATA TYPE timestamp with time zone USING "last_activity" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "cart_state" ALTER COLUMN "last_activity" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "cart_state" ALTER COLUMN "abandoned_at" SET DATA TYPE timestamp with time zone USING "abandoned_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "challenge_progress" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "challenge_progress" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "challenge_reviews" ALTER COLUMN "created_at" SET DATA TYPE timestamp with time zone USING "created_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "challenge_reviews" ALTER COLUMN "created_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "challenge_reviews" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "challenge_reviews" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "challenge_settings" ALTER COLUMN "day_start" SET DATA TYPE timestamp with time zone USING "day_start" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "challenge_settings" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "challenge_settings" ALTER COLUMN "updated_at" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "downloads" ALTER COLUMN "purchased_at" SET DATA TYPE timestamp with time zone USING "purchased_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "downloads" ALTER COLUMN "last_downloaded_at" SET DATA TYPE timestamp with time zone USING "last_downloaded_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "loyalty_ledger" ALTER COLUMN "timestamp" SET DATA TYPE timestamp with time zone USING "timestamp" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "loyalty_ledger" ALTER COLUMN "timestamp" SET DEFAULT now();--> statement-breakpoint
ALTER TABLE "media_progress" ALTER COLUMN "updated_at" SET DATA TYPE timestamp with time zone USING "updated_at" AT TIME ZONE 'UTC';--> statement-breakpoint
ALTER TABLE "media_progress" ALTER COLUMN "updated_at" SET DEFAULT now();