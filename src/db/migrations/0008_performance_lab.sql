CREATE TABLE "lab_builds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"name" text NOT NULL,
	"game_version" text NOT NULL,
	"archetype" text,
	"level" smallint,
	"position" text,
	"role" text,
	"height_cm" smallint,
	"weight_kg" smallint,
	"points_available" smallint,
	"attributes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"playstyles" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"specializations" text,
	"notes" text,
	"brief" text,
	"focus_topic" text,
	"is_primary" boolean DEFAULT false NOT NULL,
	"started_using_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"actor_user_id" uuid,
	"kind" text NOT NULL,
	"title" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lab_plans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"topic" text NOT NULL,
	"variant" text,
	"origin" text DEFAULT 'trainer' NOT NULL,
	"goals" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"baseline" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "player_statistics" ADD COLUMN "tackles_attempted" smallint;--> statement-breakpoint
ALTER TABLE "player_statistics" ADD COLUMN "extra" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "lab_builds" ADD CONSTRAINT "lab_builds_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_events" ADD CONSTRAINT "lab_events_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_events" ADD CONSTRAINT "lab_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_plans" ADD CONSTRAINT "lab_plans_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "lab_builds_player_idx" ON "lab_builds" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "lab_events_player_idx" ON "lab_events" USING btree ("player_id","created_at");--> statement-breakpoint
CREATE INDEX "lab_plans_player_idx" ON "lab_plans" USING btree ("player_id");--> statement-breakpoint
ALTER TABLE "player_statistics" ADD CONSTRAINT "ps_tackles_consistent" CHECK ("player_statistics"."tackles_attempted" is null or "player_statistics"."tackles" is null or "player_statistics"."tackles" <= "player_statistics"."tackles_attempted");