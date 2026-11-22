CREATE TABLE "player_overall_history" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"overall" smallint NOT NULL,
	"previous" smallint,
	"source" text NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "overall_source" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "overall_synced_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "player_overall_history" ADD CONSTRAINT "player_overall_history_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "overall_history_player_time_idx" ON "player_overall_history" USING btree ("player_id","recorded_at");