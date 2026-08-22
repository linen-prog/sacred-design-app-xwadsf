ALTER TABLE "alignment_reflections" DROP CONSTRAINT "alignment_reflections_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "alignment_reflections" DROP CONSTRAINT "alignment_reflections_alignment_id_daily_alignments_id_fk";
--> statement-breakpoint
ALTER TABLE "daily_alignments" DROP CONSTRAINT "daily_alignments_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "mood_entries" DROP CONSTRAINT "mood_entries_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "user_archetypes" DROP CONSTRAINT "user_archetypes_user_id_user_id_fk";
--> statement-breakpoint
ALTER TABLE "user_progress" DROP CONSTRAINT "user_progress_user_id_user_id_fk";
