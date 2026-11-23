import { sql } from "drizzle-orm";
import {
  boolean, check, index, integer, jsonb, numeric, pgTable, smallint, text, timestamp, uniqueIndex, uuid,
} from "drizzle-orm/pg-core";
import { clubs, seasons, users } from "./core";
import {
  competitionFormatEnum, dataSourceEnum, matchPlayerRoleEnum, matchStatusEnum, positionEnum,
} from "./enums";
import { players } from "./squad";

export type FormationSlot = { key: string; label: string; position: string; x: number; y: number };

export const formations = pgTable(
  "formations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // null = built-in formation available to every club
    clubId: uuid("club_id").references(() => clubs.id, { onDelete: "cascade" }),
    code: text("code").notNull(),
    name: text("name").notNull(),
    slots: jsonb("slots").$type<FormationSlot[]>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("formations_club_code_uq").on(sql`coalesce(${t.clubId}, '00000000-0000-0000-0000-000000000000'::uuid)`, t.code)],
);

export const competitions = pgTable(
  "competitions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
    seasonId: uuid("season_id").references(() => seasons.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    format: competitionFormatEnum("format").notNull().default("league"),
    pointsWin: smallint("points_win").notNull().default(3),
    pointsDraw: smallint("points_draw").notNull().default(1),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("competitions_club_idx").on(t.clubId)],
);

export const competitionTeams = pgTable(
  "competition_teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    competitionId: uuid("competition_id").notNull().references(() => competitions.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    isOwnClub: boolean("is_own_club").notNull().default(false),
    groupName: text("group_name"),
  },
  (t) => [
    uniqueIndex("competition_teams_name_uq").on(t.competitionId, sql`lower(${t.name})`),
    uniqueIndex("competition_teams_own_uq").on(t.competitionId).where(sql`${t.isOwnClub}`),
  ],
);

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
    seasonId: uuid("season_id").references(() => seasons.id, { onDelete: "set null" }),
    competitionId: uuid("competition_id").references(() => competitions.id, { onDelete: "set null" }),
    round: text("round"),
    opponentName: text("opponent_name").notNull(),
    kickoffAt: timestamp("kickoff_at", { withTimezone: true }).notNull(),
    status: matchStatusEnum("status").notNull().default("scheduled"),
    goalsFor: smallint("goals_for"),
    goalsAgainst: smallint("goals_against"),
    formationId: uuid("formation_id").references(() => formations.id, { onDelete: "set null" }),
    // Team-level numbers (possession, shots...) — only keys that were actually recorded.
    teamStats: jsonb("team_stats").$type<Record<string, number>>().notNull().default({}),
    notes: text("notes"),
    source: dataSourceEnum("source").notNull().default("manual"),
    externalId: text("external_id"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("matches_club_kickoff_idx").on(t.clubId, t.kickoffAt),
    index("matches_season_idx").on(t.seasonId),
    // Import de-duplication: the same external match can only exist once per club.
    uniqueIndex("matches_external_uq").on(t.clubId, t.source, t.externalId).where(sql`${t.externalId} is not null`),
    check(
      "matches_finished_has_score",
      sql`${t.status} <> 'finished' or (${t.goalsFor} is not null and ${t.goalsAgainst} is not null)`,
    ),
    check("matches_score_non_negative", sql`coalesce(${t.goalsFor},0) >= 0 and coalesce(${t.goalsAgainst},0) >= 0`),
  ],
);

export const matchPlayers = pgTable(
  "match_players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id").notNull().references(() => matches.id, { onDelete: "cascade" }),
    playerId: uuid("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
    role: matchPlayerRoleEnum("role").notNull().default("starter"),
    position: positionEnum("position"),
    minutesPlayed: smallint("minutes_played"),
    subInMinute: smallint("sub_in_minute"),
    subOutMinute: smallint("sub_out_minute"),
    isCaptain: boolean("is_captain").notNull().default(false),
  },
  (t) => [
    uniqueIndex("match_players_uq").on(t.matchId, t.playerId),
    index("match_players_player_idx").on(t.playerId),
  ],
);

/**
 * Individual statistics for one player in one match. Every metric except goals
 * and assists is nullable on purpose: NULL means "not recorded", which is
 * different from 0 and is never filled with invented values.
 */
export const playerStatistics = pgTable(
  "player_statistics",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    matchId: uuid("match_id").notNull().references(() => matches.id, { onDelete: "cascade" }),
    playerId: uuid("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
    goals: smallint("goals").notNull().default(0),
    assists: smallint("assists").notNull().default(0),
    shots: smallint("shots"),
    shotsOnTarget: smallint("shots_on_target"),
    passesAttempted: smallint("passes_attempted"),
    passesCompleted: smallint("passes_completed"),
    tackles: smallint("tackles"),
    /** Tackles attempted (EA FC 27 `tackleattempts`); with `tackles` gives tackle success. */
    tacklesAttempted: smallint("tackles_attempted"),
    interceptions: smallint("interceptions"),
    clearances: smallint("clearances"),
    saves: smallint("saves"),
    goalsConceded: smallint("goals_conceded"),
    cleanSheet: boolean("clean_sheet"),
    yellowCards: smallint("yellow_cards"),
    redCards: smallint("red_cards"),
    externalRating: numeric("external_rating", { precision: 3, scale: 1, mode: "number" }),
    isMotm: boolean("is_motm"),
    /** Source-specific raw extras (e.g. EA archetype id, goalkeeper save types). Never interpreted beyond documented fields. */
    extra: jsonb("extra").$type<Record<string, number | string>>().notNull().default({}),
    source: dataSourceEnum("source").notNull().default("manual"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("player_statistics_uq").on(t.matchId, t.playerId),
    index("player_statistics_player_idx").on(t.playerId),
    check("ps_goals_nn", sql`${t.goals} >= 0 and ${t.assists} >= 0`),
    check("ps_shots_consistent", sql`${t.shots} is null or ${t.shotsOnTarget} is null or ${t.shotsOnTarget} <= ${t.shots}`),
    check(
      "ps_passes_consistent",
      sql`${t.passesAttempted} is null or ${t.passesCompleted} is null or ${t.passesCompleted} <= ${t.passesAttempted}`,
    ),
    check("ps_tackles_consistent", sql`${t.tacklesAttempted} is null or ${t.tackles} is null or ${t.tackles} <= ${t.tacklesAttempted}`),
    check("ps_rating_range", sql`${t.externalRating} is null or ${t.externalRating} between 0 and 10`),
  ],
);

export const competitionFixtures = pgTable(
  "competition_fixtures",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    competitionId: uuid("competition_id").notNull().references(() => competitions.id, { onDelete: "cascade" }),
    round: text("round"),
    homeTeamId: uuid("home_team_id").notNull().references(() => competitionTeams.id, { onDelete: "cascade" }),
    awayTeamId: uuid("away_team_id").notNull().references(() => competitionTeams.id, { onDelete: "cascade" }),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    homeGoals: smallint("home_goals"),
    awayGoals: smallint("away_goals"),
    matchId: uuid("match_id").references(() => matches.id, { onDelete: "set null" }),
  },
  (t) => [
    index("fixtures_competition_idx").on(t.competitionId),
    check("fixtures_distinct_teams", sql`${t.homeTeamId} <> ${t.awayTeamId}`),
    check("fixtures_score_pair", sql`(${t.homeGoals} is null) = (${t.awayGoals} is null)`),
  ],
);

export const lineups = pgTable(
  "lineups",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    formationId: uuid("formation_id").notNull().references(() => formations.id, { onDelete: "restrict" }),
    opponentName: text("opponent_name"),
    matchId: uuid("match_id").references(() => matches.id, { onDelete: "set null" }),
    notes: text("notes"),
    captainId: uuid("captain_id").references(() => players.id, { onDelete: "set null" }),
    freeKickTakerId: uuid("free_kick_taker_id").references(() => players.id, { onDelete: "set null" }),
    penaltyTakerId: uuid("penalty_taker_id").references(() => players.id, { onDelete: "set null" }),
    cornerTakerId: uuid("corner_taker_id").references(() => players.id, { onDelete: "set null" }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("lineups_club_idx").on(t.clubId)],
);

export const lineupPlayers = pgTable(
  "lineup_players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    lineupId: uuid("lineup_id").notNull().references(() => lineups.id, { onDelete: "cascade" }),
    playerId: uuid("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
    // Starter: slot key of the formation. Bench: null slot + benchOrder.
    slotKey: text("slot_key"),
    benchOrder: integer("bench_order"),
  },
  (t) => [
    uniqueIndex("lineup_players_player_uq").on(t.lineupId, t.playerId),
    uniqueIndex("lineup_players_slot_uq").on(t.lineupId, t.slotKey).where(sql`${t.slotKey} is not null`),
    check("lineup_players_slot_or_bench", sql`(${t.slotKey} is null) <> (${t.benchOrder} is null)`),
  ],
);
