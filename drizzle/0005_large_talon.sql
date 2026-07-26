CREATE TABLE "knowledge_rows" (
	"id" text PRIMARY KEY NOT NULL,
	"book_id" text NOT NULL,
	"knowledge_type" text NOT NULL,
	"marker_reference" text NOT NULL,
	"content_body" text NOT NULL
);
