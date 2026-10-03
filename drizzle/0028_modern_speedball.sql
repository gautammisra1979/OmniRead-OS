CREATE TABLE "notify_requests" (
	"user_id" text NOT NULL,
	"product_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notify_requests_user_id_product_id_pk" PRIMARY KEY("user_id","product_id")
);
--> statement-breakpoint
ALTER TABLE "notify_requests" ADD CONSTRAINT "notify_requests_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notify_requests" ADD CONSTRAINT "notify_requests_product_id_catalog_items_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."catalog_items"("id") ON DELETE cascade ON UPDATE no action;