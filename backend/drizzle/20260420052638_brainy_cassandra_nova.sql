CREATE TABLE "user_archetypes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"primary_archetype" text NOT NULL,
	"secondary_archetype" text NOT NULL,
	"blend_name" text NOT NULL,
	"scores" jsonb NOT NULL,
	"quiz_completed" boolean DEFAULT true NOT NULL,
	"completed_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_archetypes_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
ALTER TABLE "user_archetypes" ADD CONSTRAINT "user_archetypes_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;