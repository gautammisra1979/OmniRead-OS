ALTER TABLE "branding_settings" RENAME COLUMN "logo_url" TO "logo_key";--> statement-breakpoint
ALTER TABLE "catalog_items" RENAME COLUMN "cover_url" TO "cover_key";--> statement-breakpoint
ALTER TABLE "catalog_items" RENAME COLUMN "media_url" TO "media_key";--> statement-breakpoint
UPDATE "catalog_items" SET "cover_key" = CASE WHEN "cover_key" ~ '^https://[a-z0-9]+\.public\.blob\.vercel-storage\.com/' THEN regexp_replace("cover_key", '^https://[^/]+/', '') ELSE NULL END WHERE "cover_key" IS NOT NULL;--> statement-breakpoint
UPDATE "catalog_items" SET "media_key" = CASE WHEN "media_key" ~ '^https://[a-z0-9]+\.private\.blob\.vercel-storage\.com/' THEN regexp_replace("media_key", '^https://[^/]+/', '') ELSE NULL END WHERE "media_key" IS NOT NULL;--> statement-breakpoint
UPDATE "catalog_items" SET "media_name" = NULL WHERE "media_key" IS NULL;--> statement-breakpoint
UPDATE "branding_settings" SET "logo_key" = CASE WHEN "logo_key" ~ '^https://[a-z0-9]+\.public\.blob\.vercel-storage\.com/' THEN regexp_replace("logo_key", '^https://[^/]+/', '') ELSE NULL END WHERE "logo_key" IS NOT NULL;
