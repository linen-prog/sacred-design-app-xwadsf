CREATE TABLE "alignment_reflections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"alignment_id" uuid NOT NULL,
	"reflection_text" text NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "daily_alignments" ADD COLUMN "reflection_prompt" text;--> statement-breakpoint
ALTER TABLE "alignment_reflections" ADD CONSTRAINT "alignment_reflections_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alignment_reflections" ADD CONSTRAINT "alignment_reflections_alignment_id_daily_alignments_id_fk" FOREIGN KEY ("alignment_id") REFERENCES "public"."daily_alignments"("id") ON DELETE cascade ON UPDATE no action;