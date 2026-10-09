ALTER TABLE "email_settings" ADD COLUMN "sendgrid_api_key_encrypted" text;--> statement-breakpoint
ALTER TABLE "email_settings" ADD COLUMN "sendgrid_region" text DEFAULT 'global' NOT NULL;--> statement-breakpoint
ALTER TABLE "email_settings" ADD COLUMN "azure_connection_string_encrypted" text;