CREATE TABLE "challenge_progress" (
	"user_id" text NOT NULL,
	"product_id" text NOT NULL,
	"product_title" text NOT NULL,
	"format" text NOT NULL,
	"total_units" double precision NOT NULL,
	"completed_units" double precision NOT NULL,
	"day" integer NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "challenge_progress_user_id_product_id_pk" PRIMARY KEY("user_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "challenge_reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"product_id" text NOT NULL,
	"product_title" text NOT NULL,
	"rating" integer NOT NULL,
	"key_takeaway" text NOT NULL,
	"review_text" text NOT NULL,
	"action_plan" text NOT NULL,
	"pacing_eval" text NOT NULL,
	"is_private" boolean NOT NULL,
	"has_spoiler" boolean NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "challenge_reviews_user_product_unique" UNIQUE("user_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "challenge_settings" (
	"user_id" text PRIMARY KEY NOT NULL,
	"daily_target" double precision,
	"day_start" timestamp,
	"reminder_interval_days" integer DEFAULT 1 NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "challenge_progress" ADD CONSTRAINT "challenge_progress_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_reviews" ADD CONSTRAINT "challenge_reviews_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "challenge_settings" ADD CONSTRAINT "challenge_settings_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;