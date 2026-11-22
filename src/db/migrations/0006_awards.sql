CREATE TYPE "public"."award_kind" AS ENUM('silver', 'gold');--> statement-breakpoint
CREATE TABLE "award_editions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"kind" "award_kind" NOT NULL,
	"label" text NOT NULL,
	"period_start" date NOT NULL,
	"period_end" date NOT NULL,
	"voting_opens_at" timestamp with time zone NOT NULL,
	"voting_closes_at" timestamp with time zone NOT NULL,
	"winner_player_id" uuid,
	"winner_name" text,
	"winner_shirt" integer,
	"winner_votes" integer,
	"total_votes" integer,
	"finalized_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "award_votes" (
	"edition_id" uuid NOT NULL,
	"voter_user_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "award_votes_edition_id_voter_user_id_pk" PRIMARY KEY("edition_id","voter_user_id")
);
--> statement-breakpoint
ALTER TABLE "award_editions" ADD CONSTRAINT "award_editions_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "award_editions" ADD CONSTRAINT "award_editions_winner_player_id_players_id_fk" FOREIGN KEY ("winner_player_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "award_votes" ADD CONSTRAINT "award_votes_edition_id_award_editions_id_fk" FOREIGN KEY ("edition_id") REFERENCES "public"."award_editions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "award_votes" ADD CONSTRAINT "award_votes_voter_user_id_users_id_fk" FOREIGN KEY ("voter_user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "award_votes" ADD CONSTRAINT "award_votes_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "award_editions_period_uq" ON "award_editions" USING btree ("club_id","kind","period_start");--> statement-breakpoint
CREATE INDEX "award_editions_club_close_idx" ON "award_editions" USING btree ("club_id","voting_closes_at");--> statement-breakpoint
CREATE INDEX "award_votes_edition_player_idx" ON "award_votes" USING btree ("edition_id","player_id");