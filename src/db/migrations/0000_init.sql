CREATE TYPE "public"."announcement_category" AS ENUM('administrative', 'callup', 'match_schedule', 'calendar_change', 'coaching_staff', 'general');--> statement-breakpoint
CREATE TYPE "public"."announcement_priority" AS ENUM('low', 'normal', 'high', 'urgent');--> statement-breakpoint
CREATE TYPE "public"."attendance_status" AS ENUM('pending', 'confirmed', 'declined', 'present', 'absent');--> statement-breakpoint
CREATE TYPE "public"."availability_status" AS ENUM('available', 'unavailable', 'doubtful');--> statement-breakpoint
CREATE TYPE "public"."competition_format" AS ENUM('league', 'knockout', 'groups_knockout', 'friendly', 'ea_division');--> statement-breakpoint
CREATE TYPE "public"."data_source" AS ENUM('manual', 'ea_fc', 'file_import');--> statement-breakpoint
CREATE TYPE "public"."event_type" AS ENUM('match', 'training', 'meeting', 'other');--> statement-breakpoint
CREATE TYPE "public"."match_player_role" AS ENUM('starter', 'substitute', 'unused');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('scheduled', 'finished', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."player_status" AS ENUM('starter', 'reserve', 'available', 'unavailable', 'sidelined', 'inactive');--> statement-breakpoint
CREATE TYPE "public"."field_position" AS ENUM('GK', 'CB', 'LB', 'RB', 'LWB', 'RWB', 'CDM', 'CM', 'CAM', 'LM', 'RM', 'LW', 'RW', 'CF', 'ST');--> statement-breakpoint
CREATE TYPE "public"."position_group" AS ENUM('GK', 'DEF', 'MID', 'ATT');--> statement-breakpoint
CREATE TYPE "public"."preferred_foot" AS ENUM('right', 'left', 'both');--> statement-breakpoint
CREATE TYPE "public"."role_key" AS ENUM('president', 'admin', 'coach', 'assistant_coach', 'analyst', 'player', 'visitor');--> statement-breakpoint
CREATE TYPE "public"."sync_status" AS ENUM('running', 'success', 'partial', 'failed');--> statement-breakpoint
CREATE TYPE "public"."sync_trigger" AS ENUM('manual', 'scheduled', 'file');--> statement-breakpoint
CREATE TYPE "public"."visibility" AS ENUM('public', 'members', 'staff');--> statement-breakpoint
CREATE TABLE "clubs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"short_name" text,
	"crest_path" text DEFAULT '/brand/ascend-fc-crest.png' NOT NULL,
	"ea_platform" text,
	"ea_club_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "login_attempts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"ip_address" text,
	"success" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "memberships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"club_id" uuid NOT NULL,
	"role_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"motto" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "password_reset_tokens" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "permissions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"description" text NOT NULL,
	CONSTRAINT "permissions_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "role_permissions" (
	"role_id" uuid NOT NULL,
	"permission_id" uuid NOT NULL,
	CONSTRAINT "role_permissions_role_id_permission_id_pk" PRIMARY KEY("role_id","permission_id")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" "role_key" NOT NULL,
	"name" text NOT NULL,
	"rank" integer NOT NULL,
	CONSTRAINT "roles_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "seasons" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"name" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"is_current" boolean DEFAULT false NOT NULL,
	"division" text,
	"league_position" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"display_name" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"last_login_at" timestamp with time zone,
	"password_changed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"user_id" uuid,
	"full_name" text NOT NULL,
	"nickname" text NOT NULL,
	"avatar_url" text,
	"ea_name" text,
	"shirt_number" smallint,
	"primary_position" "field_position" NOT NULL,
	"secondary_positions" "field_position"[] DEFAULT '{}'::field_position[] NOT NULL,
	"preferred_foot" "preferred_foot",
	"overall" smallint,
	"play_style" text,
	"joined_on" date,
	"status" "player_status" DEFAULT 'available' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "players_shirt_range" CHECK ("players"."shirt_number" is null or "players"."shirt_number" between 1 and 99),
	CONSTRAINT "players_overall_range" CHECK ("players"."overall" is null or "players"."overall" between 1 and 99)
);
--> statement-breakpoint
CREATE TABLE "rating_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"position_group" "position_group" NOT NULL,
	"weights" jsonb NOT NULL,
	"updated_by" uuid,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rating_settings" (
	"club_id" uuid PRIMARY KEY NOT NULL,
	"external_rating_weight_pct" integer DEFAULT 50 NOT NULL,
	"min_matches_pct" integer DEFAULT 30 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competition_fixtures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competition_id" uuid NOT NULL,
	"round" text,
	"home_team_id" uuid NOT NULL,
	"away_team_id" uuid NOT NULL,
	"scheduled_at" timestamp with time zone,
	"home_goals" smallint,
	"away_goals" smallint,
	"match_id" uuid,
	CONSTRAINT "fixtures_distinct_teams" CHECK ("competition_fixtures"."home_team_id" <> "competition_fixtures"."away_team_id"),
	CONSTRAINT "fixtures_score_pair" CHECK (("competition_fixtures"."home_goals" is null) = ("competition_fixtures"."away_goals" is null))
);
--> statement-breakpoint
CREATE TABLE "competition_teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"competition_id" uuid NOT NULL,
	"name" text NOT NULL,
	"is_own_club" boolean DEFAULT false NOT NULL,
	"group_name" text
);
--> statement-breakpoint
CREATE TABLE "competitions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"season_id" uuid,
	"name" text NOT NULL,
	"format" "competition_format" DEFAULT 'league' NOT NULL,
	"points_win" smallint DEFAULT 3 NOT NULL,
	"points_draw" smallint DEFAULT 1 NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "formations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"slots" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "lineup_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lineup_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"slot_key" text,
	"bench_order" integer,
	CONSTRAINT "lineup_players_slot_or_bench" CHECK (("lineup_players"."slot_key" is null) <> ("lineup_players"."bench_order" is null))
);
--> statement-breakpoint
CREATE TABLE "lineups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"name" text NOT NULL,
	"formation_id" uuid NOT NULL,
	"opponent_name" text,
	"match_id" uuid,
	"notes" text,
	"captain_id" uuid,
	"free_kick_taker_id" uuid,
	"penalty_taker_id" uuid,
	"corner_taker_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_players" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"role" "match_player_role" DEFAULT 'starter' NOT NULL,
	"position" "field_position",
	"minutes_played" smallint,
	"sub_in_minute" smallint,
	"sub_out_minute" smallint,
	"is_captain" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"season_id" uuid,
	"competition_id" uuid,
	"round" text,
	"opponent_name" text NOT NULL,
	"kickoff_at" timestamp with time zone NOT NULL,
	"status" "match_status" DEFAULT 'scheduled' NOT NULL,
	"goals_for" smallint,
	"goals_against" smallint,
	"formation_id" uuid,
	"team_stats" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"notes" text,
	"source" "data_source" DEFAULT 'manual' NOT NULL,
	"external_id" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "matches_finished_has_score" CHECK ("matches"."status" <> 'finished' or ("matches"."goals_for" is not null and "matches"."goals_against" is not null)),
	CONSTRAINT "matches_score_non_negative" CHECK (coalesce("matches"."goals_for",0) >= 0 and coalesce("matches"."goals_against",0) >= 0)
);
--> statement-breakpoint
CREATE TABLE "player_statistics" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"match_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"goals" smallint DEFAULT 0 NOT NULL,
	"assists" smallint DEFAULT 0 NOT NULL,
	"shots" smallint,
	"shots_on_target" smallint,
	"passes_attempted" smallint,
	"passes_completed" smallint,
	"tackles" smallint,
	"interceptions" smallint,
	"clearances" smallint,
	"saves" smallint,
	"goals_conceded" smallint,
	"clean_sheet" boolean,
	"yellow_cards" smallint,
	"red_cards" smallint,
	"external_rating" numeric(3, 1),
	"is_motm" boolean,
	"source" "data_source" DEFAULT 'manual' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ps_goals_nn" CHECK ("player_statistics"."goals" >= 0 and "player_statistics"."assists" >= 0),
	CONSTRAINT "ps_shots_consistent" CHECK ("player_statistics"."shots" is null or "player_statistics"."shots_on_target" is null or "player_statistics"."shots_on_target" <= "player_statistics"."shots"),
	CONSTRAINT "ps_passes_consistent" CHECK ("player_statistics"."passes_attempted" is null or "player_statistics"."passes_completed" is null or "player_statistics"."passes_completed" <= "player_statistics"."passes_attempted"),
	CONSTRAINT "ps_rating_range" CHECK ("player_statistics"."external_rating" is null or "player_statistics"."external_rating" between 0 and 10)
);
--> statement-breakpoint
CREATE TABLE "announcements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"category" "announcement_category" DEFAULT 'general' NOT NULL,
	"priority" "announcement_priority" DEFAULT 'normal' NOT NULL,
	"visibility" "visibility" DEFAULT 'members' NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	"author_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "announcements_expiry" CHECK ("announcements"."expires_at" is null or "announcements"."expires_at" > "announcements"."published_at")
);
--> statement-breakpoint
CREATE TABLE "attendance" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"player_id" uuid NOT NULL,
	"status" "attendance_status" DEFAULT 'pending' NOT NULL,
	"note" text,
	"responded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" bigserial PRIMARY KEY NOT NULL,
	"club_id" uuid,
	"actor_user_id" uuid,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"ip_address" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "calendar_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"type" "event_type" NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"starts_at" timestamp with time zone NOT NULL,
	"ends_at" timestamp with time zone,
	"match_id" uuid,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "media_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"template" text NOT NULL,
	"format" text NOT NULL,
	"title" text NOT NULL,
	"file_path" text,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"club_id" uuid,
	"type" text NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"link" text,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "player_availability" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"player_id" uuid NOT NULL,
	"status" "availability_status" NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "availability_range" CHECK ("player_availability"."ends_on" is null or "player_availability"."ends_on" >= "player_availability"."starts_on")
);
--> statement-breakpoint
CREATE TABLE "synchronization_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"trigger" "sync_trigger" NOT NULL,
	"status" "sync_status" DEFAULT 'running' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"items_found" integer DEFAULT 0 NOT NULL,
	"items_created" integer DEFAULT 0 NOT NULL,
	"items_skipped" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"details" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"triggered_by" uuid
);
--> statement-breakpoint
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_roles_id_fk" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_permissions_id_fk" FOREIGN KEY ("permission_id") REFERENCES "public"."permissions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "seasons" ADD CONSTRAINT "seasons_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "players" ADD CONSTRAINT "players_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_profiles" ADD CONSTRAINT "rating_profiles_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_profiles" ADD CONSTRAINT "rating_profiles_updated_by_users_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "rating_settings" ADD CONSTRAINT "rating_settings_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_fixtures" ADD CONSTRAINT "competition_fixtures_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_fixtures" ADD CONSTRAINT "competition_fixtures_home_team_id_competition_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."competition_teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_fixtures" ADD CONSTRAINT "competition_fixtures_away_team_id_competition_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."competition_teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_fixtures" ADD CONSTRAINT "competition_fixtures_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competition_teams" ADD CONSTRAINT "competition_teams_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitions" ADD CONSTRAINT "competitions_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "formations" ADD CONSTRAINT "formations_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lineup_players" ADD CONSTRAINT "lineup_players_lineup_id_lineups_id_fk" FOREIGN KEY ("lineup_id") REFERENCES "public"."lineups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lineup_players" ADD CONSTRAINT "lineup_players_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lineups" ADD CONSTRAINT "lineups_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lineups" ADD CONSTRAINT "lineups_formation_id_formations_id_fk" FOREIGN KEY ("formation_id") REFERENCES "public"."formations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lineups" ADD CONSTRAINT "lineups_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lineups" ADD CONSTRAINT "lineups_captain_id_players_id_fk" FOREIGN KEY ("captain_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lineups" ADD CONSTRAINT "lineups_free_kick_taker_id_players_id_fk" FOREIGN KEY ("free_kick_taker_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lineups" ADD CONSTRAINT "lineups_penalty_taker_id_players_id_fk" FOREIGN KEY ("penalty_taker_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lineups" ADD CONSTRAINT "lineups_corner_taker_id_players_id_fk" FOREIGN KEY ("corner_taker_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lineups" ADD CONSTRAINT "lineups_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_players" ADD CONSTRAINT "match_players_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_season_id_seasons_id_fk" FOREIGN KEY ("season_id") REFERENCES "public"."seasons"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_competition_id_competitions_id_fk" FOREIGN KEY ("competition_id") REFERENCES "public"."competitions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_formation_id_formations_id_fk" FOREIGN KEY ("formation_id") REFERENCES "public"."formations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_statistics" ADD CONSTRAINT "player_statistics_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_statistics" ADD CONSTRAINT "player_statistics_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_author_id_users_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_event_id_calendar_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."calendar_events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "calendar_events" ADD CONSTRAINT "calendar_events_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "player_availability" ADD CONSTRAINT "player_availability_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "synchronization_logs" ADD CONSTRAINT "synchronization_logs_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "synchronization_logs" ADD CONSTRAINT "synchronization_logs_triggered_by_users_id_fk" FOREIGN KEY ("triggered_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "clubs_org_slug_uq" ON "clubs" USING btree ("organization_id","slug");--> statement-breakpoint
CREATE INDEX "login_attempts_email_time_idx" ON "login_attempts" USING btree (lower("email"),"created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "memberships_user_club_role_uq" ON "memberships" USING btree ("user_id","club_id","role_id");--> statement-breakpoint
CREATE INDEX "memberships_club_idx" ON "memberships" USING btree ("club_id");--> statement-breakpoint
CREATE INDEX "prt_user_idx" ON "password_reset_tokens" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "seasons_club_name_uq" ON "seasons" USING btree ("club_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "seasons_one_current_uq" ON "seasons" USING btree ("club_id") WHERE "seasons"."is_current";--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sessions_expires_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_lower_uq" ON "users" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "players_club_idx" ON "players" USING btree ("club_id");--> statement-breakpoint
CREATE UNIQUE INDEX "players_club_user_uq" ON "players" USING btree ("club_id","user_id") WHERE "players"."user_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "players_club_ea_name_uq" ON "players" USING btree ("club_id",lower("ea_name")) WHERE "players"."ea_name" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "players_club_shirt_uq" ON "players" USING btree ("club_id","shirt_number") WHERE "players"."shirt_number" is not null and "players"."status" <> 'inactive';--> statement-breakpoint
CREATE UNIQUE INDEX "rating_profiles_club_group_uq" ON "rating_profiles" USING btree ("club_id","position_group");--> statement-breakpoint
CREATE INDEX "fixtures_competition_idx" ON "competition_fixtures" USING btree ("competition_id");--> statement-breakpoint
CREATE UNIQUE INDEX "competition_teams_name_uq" ON "competition_teams" USING btree ("competition_id",lower("name"));--> statement-breakpoint
CREATE UNIQUE INDEX "competition_teams_own_uq" ON "competition_teams" USING btree ("competition_id") WHERE "competition_teams"."is_own_club";--> statement-breakpoint
CREATE INDEX "competitions_club_idx" ON "competitions" USING btree ("club_id");--> statement-breakpoint
CREATE UNIQUE INDEX "formations_club_code_uq" ON "formations" USING btree (coalesce("club_id", '00000000-0000-0000-0000-000000000000'::uuid),"code");--> statement-breakpoint
CREATE UNIQUE INDEX "lineup_players_player_uq" ON "lineup_players" USING btree ("lineup_id","player_id");--> statement-breakpoint
CREATE UNIQUE INDEX "lineup_players_slot_uq" ON "lineup_players" USING btree ("lineup_id","slot_key") WHERE "lineup_players"."slot_key" is not null;--> statement-breakpoint
CREATE INDEX "lineups_club_idx" ON "lineups" USING btree ("club_id");--> statement-breakpoint
CREATE UNIQUE INDEX "match_players_uq" ON "match_players" USING btree ("match_id","player_id");--> statement-breakpoint
CREATE INDEX "match_players_player_idx" ON "match_players" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "matches_club_kickoff_idx" ON "matches" USING btree ("club_id","kickoff_at");--> statement-breakpoint
CREATE INDEX "matches_season_idx" ON "matches" USING btree ("season_id");--> statement-breakpoint
CREATE UNIQUE INDEX "matches_external_uq" ON "matches" USING btree ("club_id","source","external_id") WHERE "matches"."external_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "player_statistics_uq" ON "player_statistics" USING btree ("match_id","player_id");--> statement-breakpoint
CREATE INDEX "player_statistics_player_idx" ON "player_statistics" USING btree ("player_id");--> statement-breakpoint
CREATE INDEX "announcements_club_pub_idx" ON "announcements" USING btree ("club_id","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "attendance_event_player_uq" ON "attendance" USING btree ("event_id","player_id");--> statement-breakpoint
CREATE INDEX "audit_logs_club_time_idx" ON "audit_logs" USING btree ("club_id","created_at");--> statement-breakpoint
CREATE INDEX "calendar_events_club_time_idx" ON "calendar_events" USING btree ("club_id","starts_at");--> statement-breakpoint
CREATE INDEX "notifications_user_unread_idx" ON "notifications" USING btree ("user_id","read_at","created_at");--> statement-breakpoint
CREATE INDEX "availability_player_idx" ON "player_availability" USING btree ("player_id","starts_on");--> statement-breakpoint
CREATE INDEX "sync_logs_club_time_idx" ON "synchronization_logs" USING btree ("club_id","started_at");