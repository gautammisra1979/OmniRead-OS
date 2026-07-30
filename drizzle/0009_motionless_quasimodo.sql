CREATE TABLE "admin_auth" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text,
	"passcode_hash" text,
	"recovery_encrypted" text
);
