CREATE TABLE "email_send_failures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"notification_type" text NOT NULL,
	"recipient" text NOT NULL,
	"error_message" text NOT NULL,
	"provider" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"provider" text DEFAULT 'resend' NOT NULL,
	"from_name" text DEFAULT '' NOT NULL,
	"from_address" text DEFAULT '' NOT NULL,
	"resend_api_key_encrypted" text,
	"postmark_api_key_encrypted" text,
	"ses_access_key_id" text,
	"ses_secret_access_key_encrypted" text,
	"ses_region" text DEFAULT 'us-east-1' NOT NULL
);
