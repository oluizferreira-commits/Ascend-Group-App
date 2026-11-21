-- Database-level guards that must hold no matter which code path writes.

-- 1. Audit log is append-only.
CREATE OR REPLACE FUNCTION audit_logs_block_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only (% blocked)', TG_OP USING ERRCODE = 'insufficient_privilege';
END $$;
--> statement-breakpoint
CREATE TRIGGER audit_logs_no_update BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION audit_logs_block_mutation();
--> statement-breakpoint

-- 2. Multi-club isolation: rows that link a player to a match / lineup / event
--    must belong to the same club. Prevents data from leaking between clubs.
CREATE OR REPLACE FUNCTION assert_player_in_club(p_player uuid, p_club uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM players WHERE id = p_player AND club_id = p_club) THEN
    RAISE EXCEPTION 'player % does not belong to club %', p_player, p_club USING ERRCODE = 'check_violation';
  END IF;
END $$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION match_player_same_club() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM assert_player_in_club(NEW.player_id, (SELECT club_id FROM matches WHERE id = NEW.match_id));
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER match_players_same_club BEFORE INSERT OR UPDATE ON match_players
  FOR EACH ROW EXECUTE FUNCTION match_player_same_club();
--> statement-breakpoint
CREATE TRIGGER player_statistics_same_club BEFORE INSERT OR UPDATE ON player_statistics
  FOR EACH ROW EXECUTE FUNCTION match_player_same_club();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION lineup_player_same_club() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM assert_player_in_club(NEW.player_id, (SELECT club_id FROM lineups WHERE id = NEW.lineup_id));
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER lineup_players_same_club BEFORE INSERT OR UPDATE ON lineup_players
  FOR EACH ROW EXECUTE FUNCTION lineup_player_same_club();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION attendance_same_club() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  PERFORM assert_player_in_club(NEW.player_id, (SELECT club_id FROM calendar_events WHERE id = NEW.event_id));
  RETURN NEW;
END $$;
--> statement-breakpoint
CREATE TRIGGER attendance_same_club BEFORE INSERT OR UPDATE ON attendance
  FOR EACH ROW EXECUTE FUNCTION attendance_same_club();
--> statement-breakpoint

-- 3. Automatic updated_at.
CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;
--> statement-breakpoint
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['organizations','clubs','seasons','users','players','matches','lineups','announcements','player_statistics']
  LOOP
    EXECUTE format('CREATE TRIGGER %I_touch BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION touch_updated_at()', t, t);
  END LOOP;
END $$;
--> statement-breakpoint

-- 4. Standings are always derived from fixtures, never stored by hand.
CREATE OR REPLACE VIEW standings AS
WITH results AS (
  SELECT f.competition_id, f.home_team_id AS team_id, f.home_goals AS gf, f.away_goals AS ga
    FROM competition_fixtures f WHERE f.home_goals IS NOT NULL
  UNION ALL
  SELECT f.competition_id, f.away_team_id, f.away_goals, f.home_goals
    FROM competition_fixtures f WHERE f.home_goals IS NOT NULL
)
SELECT
  t.competition_id,
  t.id AS team_id,
  t.name AS team_name,
  t.is_own_club,
  t.group_name,
  count(r.team_id)::int AS played,
  count(*) FILTER (WHERE r.gf > r.ga)::int AS won,
  count(*) FILTER (WHERE r.gf = r.ga)::int AS drawn,
  count(*) FILTER (WHERE r.gf < r.ga)::int AS lost,
  coalesce(sum(r.gf), 0)::int AS goals_for,
  coalesce(sum(r.ga), 0)::int AS goals_against,
  (coalesce(sum(r.gf), 0) - coalesce(sum(r.ga), 0))::int AS goal_difference,
  (count(*) FILTER (WHERE r.gf > r.ga) * c.points_win + count(*) FILTER (WHERE r.gf = r.ga) * c.points_draw)::int AS points
FROM competition_teams t
JOIN competitions c ON c.id = t.competition_id
LEFT JOIN results r ON r.team_id = t.id AND r.competition_id = t.competition_id
GROUP BY t.competition_id, t.id, t.name, t.is_own_club, t.group_name, c.points_win, c.points_draw;
