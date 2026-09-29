CREATE TABLE "media_progress" (
	"user_id" text NOT NULL,
	"product_id" text NOT NULL,
	"position_seconds" double precision NOT NULL,
	"duration" double precision NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "media_progress_user_id_product_id_pk" PRIMARY KEY("user_id","product_id")
);
--> statement-breakpoint
ALTER TABLE "media_progress" ADD CONSTRAINT "media_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;