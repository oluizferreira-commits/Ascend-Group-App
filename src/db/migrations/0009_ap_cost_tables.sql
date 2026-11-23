CREATE TABLE "lab_cost_tables" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"game_version" text NOT NULL,
	"season" text NOT NULL,
	"archetype" text NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"source" text,
	"source_url" text,
	"verified_on" date,
	"notes" text,
	"data" jsonb NOT NULL,
	"created_by" uuid,
	"verified_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "lab_builds" ADD COLUMN "cost_table_id" uuid;--> statement-breakpoint
ALTER TABLE "lab_builds" ADD COLUMN "purchases" jsonb DEFAULT '{}'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "lab_builds" ADD COLUMN "validation" jsonb;--> statement-breakpoint
ALTER TABLE "lab_cost_tables" ADD CONSTRAINT "lab_cost_tables_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lab_cost_tables" ADD CONSTRAINT "lab_cost_tables_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "lab_cost_tables_uq" ON "lab_cost_tables" USING btree ("game_version","season","archetype","revision");--> statement-breakpoint
ALTER TABLE "lab_builds" ADD CONSTRAINT "lab_builds_cost_table_id_lab_cost_tables_id_fk" FOREIGN KEY ("cost_table_id") REFERENCES "public"."lab_cost_tables"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
-- Verified (and archived) cost tables are immutable: only verified → archived is allowed.
-- Corrections must be a new revision, so builds keep the exact numbers they were calculated with.
CREATE OR REPLACE FUNCTION lab_cost_tables_guard() RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.status <> 'draft' THEN RAISE EXCEPTION 'lab_cost_tables: only draft tables can be deleted' USING ERRCODE = 'check_violation'; END IF;
    RETURN OLD;
  END IF;
  IF OLD.status IN ('verified', 'archived') THEN
    IF NEW.data IS DISTINCT FROM OLD.data OR NEW.game_version IS DISTINCT FROM OLD.game_version OR NEW.season IS DISTINCT FROM OLD.season
       OR NEW.archetype IS DISTINCT FROM OLD.archetype OR NEW.revision IS DISTINCT FROM OLD.revision OR NEW.source IS DISTINCT FROM OLD.source
       OR NEW.verified_on IS DISTINCT FROM OLD.verified_on THEN
      RAISE EXCEPTION 'lab_cost_tables: verified tables are immutable — create a new revision' USING ERRCODE = 'check_violation';
    END IF;
    IF NOT (NEW.status = OLD.status OR (OLD.status = 'verified' AND NEW.status = 'archived')) THEN
      RAISE EXCEPTION 'lab_cost_tables: invalid status change % → %', OLD.status, NEW.status USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  IF NEW.status = 'verified' AND (NEW.source IS NULL OR NEW.verified_on IS NULL) THEN
    RAISE EXCEPTION 'lab_cost_tables: a verified table needs source and verified_on' USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$ LANGUAGE plpgsql;
--> statement-breakpoint
CREATE TRIGGER lab_cost_tables_guard BEFORE UPDATE OR DELETE ON lab_cost_tables FOR EACH ROW EXECUTE FUNCTION lab_cost_tables_guard();
--> statement-breakpoint
ALTER TABLE "lab_cost_tables" ADD CONSTRAINT "lab_cost_tables_status_ck" CHECK (status IN ('draft', 'verified', 'archived'));
--> statement-breakpoint
ALTER TABLE "lab_cost_tables" ADD CONSTRAINT "lab_cost_tables_verified_ck" CHECK (status = 'draft' OR (source IS NOT NULL AND verified_on IS NOT NULL));
