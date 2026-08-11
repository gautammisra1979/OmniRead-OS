-- Manually added: pre-launch test/prototype data with no retained value.
-- Required because the notNull user_id column being added below has no
-- default, and would otherwise fail against these tables' existing rows.
TRUNCATE TABLE "cart_items", "cart_state", "wallet", "loyalty_config", "loyalty_ledger", "downloads", "refund_claims";--> statement-breakpoint
ALTER TABLE "cart_items" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "cart_state" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "downloads" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "loyalty_config" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "loyalty_ledger" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "refund_claims" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "wallet" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "is_anonymous" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "loyalty_config" DROP CONSTRAINT "loyalty_config_owner_id_status_pk";--> statement-breakpoint
ALTER TABLE "cart_items" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "cart_state" ADD PRIMARY KEY ("user_id");--> statement-breakpoint
ALTER TABLE "cart_state" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "downloads" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "loyalty_config" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "loyalty_ledger" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "refund_claims" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "wallet" ADD PRIMARY KEY ("user_id");--> statement-breakpoint
ALTER TABLE "wallet" ALTER COLUMN "user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "loyalty_config" ADD CONSTRAINT "loyalty_config_user_id_status_pk" PRIMARY KEY("user_id","status");--> statement-breakpoint
ALTER TABLE "cart_items" ADD CONSTRAINT "cart_items_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_state" ADD CONSTRAINT "cart_state_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "downloads" ADD CONSTRAINT "downloads_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_config" ADD CONSTRAINT "loyalty_config_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "loyalty_ledger" ADD CONSTRAINT "loyalty_ledger_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "refund_claims" ADD CONSTRAINT "refund_claims_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet" ADD CONSTRAINT "wallet_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cart_items" DROP COLUMN "owner_id";--> statement-breakpoint
ALTER TABLE "cart_state" DROP COLUMN "owner_id";--> statement-breakpoint
ALTER TABLE "downloads" DROP COLUMN "owner_id";--> statement-breakpoint
ALTER TABLE "loyalty_config" DROP COLUMN "owner_id";--> statement-breakpoint
ALTER TABLE "loyalty_ledger" DROP COLUMN "owner_id";--> statement-breakpoint
ALTER TABLE "refund_claims" DROP COLUMN "owner_id";--> statement-breakpoint
ALTER TABLE "wallet" DROP COLUMN "owner_id";
