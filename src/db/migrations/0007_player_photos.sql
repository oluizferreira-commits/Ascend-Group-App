CREATE TABLE "player_photos" (
	"player_id" uuid PRIMARY KEY NOT NULL,
	"mime" text NOT NULL,
	"data" "bytea" NOT NULL,
	"has_alpha" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "photo_x" smallint DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "photo_y" smallint DEFAULT 20 NOT NULL;--> statement-breakpoint
ALTER TABLE "players" ADD COLUMN "photo_zoom" smallint DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE "player_photos" ADD CONSTRAINT "player_photos_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;