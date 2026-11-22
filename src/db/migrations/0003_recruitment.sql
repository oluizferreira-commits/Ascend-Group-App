CREATE TYPE "public"."application_status" AS ENUM('new', 'reviewing', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "application_photos" (
	"application_id" uuid PRIMARY KEY NOT NULL,
	"mime" text NOT NULL,
	"data" "bytea" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transfer_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"club_id" uuid NOT NULL,
	"status" "application_status" DEFAULT 'new' NOT NULL,
	"full_name" text NOT NULL,
	"age" smallint,
	"location" text,
	"ea_name" text NOT NULL,
	"platform" text NOT NULL,
	"primary_position" "field_position" NOT NULL,
	"secondary_positions" "field_position"[] DEFAULT '{}'::field_position[] NOT NULL,
	"overall" smallint,
	"preferred_foot" "preferred_foot",
	"play_style" text,
	"availability" text,
	"previous_clubs" text,
	"contact_whatsapp" text,
	"contact_discord" text,
	"contact_email" text,
	"contact_instagram" text,
	"video_url" text,
	"message" text,
	"has_photo" integer DEFAULT 0 NOT NULL,
	"consent_at" timestamp with time zone NOT NULL,
	"ip_hash" text,
	"staff_notes" text,
	"player_id" uuid,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "applications_age_range" CHECK ("transfer_applications"."age" is null or "transfer_applications"."age" between 10 and 99),
	CONSTRAINT "applications_overall_range" CHECK ("transfer_applications"."overall" is null or "transfer_applications"."overall" between 1 and 99),
	CONSTRAINT "applications_has_contact" CHECK (coalesce("transfer_applications"."contact_whatsapp", "transfer_applications"."contact_discord", "transfer_applications"."contact_email", "transfer_applications"."contact_instagram") is not null)
);
--> statement-breakpoint
ALTER TABLE "application_photos" ADD CONSTRAINT "application_photos_application_id_transfer_applications_id_fk" FOREIGN KEY ("application_id") REFERENCES "public"."transfer_applications"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_applications" ADD CONSTRAINT "transfer_applications_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_applications" ADD CONSTRAINT "transfer_applications_player_id_players_id_fk" FOREIGN KEY ("player_id") REFERENCES "public"."players"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_applications" ADD CONSTRAINT "transfer_applications_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "applications_club_status_idx" ON "transfer_applications" USING btree ("club_id","status","created_at");--> statement-breakpoint
CREATE INDEX "applications_ip_time_idx" ON "transfer_applications" USING btree ("ip_hash","created_at");