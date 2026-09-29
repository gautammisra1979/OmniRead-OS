DELETE FROM "loyalty_config";--> statement-breakpoint
ALTER TABLE "loyalty_config" DROP CONSTRAINT "loyalty_config_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "loyalty_config" DROP CONSTRAINT "loyalty_config_user_id_status_pk";--> statement-breakpoint
ALTER TABLE "loyalty_config" ADD COLUMN "id" text DEFAULT 'global' NOT NULL;--> statement-breakpoint
ALTER TABLE "loyalty_config" ADD CONSTRAINT "loyalty_config_id_status_pk" PRIMARY KEY("id","status");--> statement-breakpoint
ALTER TABLE "loyalty_config" DROP COLUMN "user_id";
