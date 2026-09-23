CREATE TABLE "credit_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"cost_per_1k" double precision DEFAULT 0.01 NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wallet" DROP COLUMN "cost_per_1k";