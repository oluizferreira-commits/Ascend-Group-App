import { sql } from "drizzle-orm";
import {
  date, index, integer, jsonb, pgTable, smallint, text, timestamp, uniqueIndex, uuid, check,
} from "drizzle-orm/pg-core";
import { clubs, users } from "./core";
import { playerStatusEnum, positionEnum, positionGroupEnum, preferredFootEnum } from "./enums";

/**
 * A player of a club. This table also holds what the spec called
 * "player_profiles" (1:1 data such as foot, overall, style) — keeping it in a
 * single row avoids a join on every roster query.
 */
export const players = pgTable(
  "players",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    fullName: text("full_name").notNull(),
    nickname: text("nickname").notNull(),
    avatarUrl: text("avatar_url"),
    eaName: text("ea_name"),
    shirtNumber: smallint("shirt_number"),
    primaryPosition: positionEnum("primary_position").notNull(),
    secondaryPositions: positionEnum("secondary_positions").array().notNull().default(sql`'{}'::field_position[]`),
    preferredFoot: preferredFootEnum("preferred_foot"),
    overall: smallint("overall"),
    playStyle: text("play_style"),
    joinedOn: date("joined_on"),
    status: playerStatusEnum("status").notNull().default("available"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("players_club_idx").on(t.clubId),
    uniqueIndex("players_club_user_uq").on(t.clubId, t.userId).where(sql`${t.userId} is not null`),
    uniqueIndex("players_club_ea_name_uq").on(t.clubId, sql`lower(${t.eaName})`).where(sql`${t.eaName} is not null`),
    uniqueIndex("players_club_shirt_uq")
      .on(t.clubId, t.shirtNumber)
      .where(sql`${t.shirtNumber} is not null and ${t.status} <> 'inactive'`),
    check("players_shirt_range", sql`${t.shirtNumber} is null or ${t.shirtNumber} between 1 and 99`),
    check("players_overall_range", sql`${t.overall} is null or ${t.overall} between 1 and 99`),
  ],
);

/** Per-club, per-position-group weights for the configurable rating engine. */
export const ratingProfiles = pgTable(
  "rating_profiles",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
    positionGroup: positionGroupEnum("position_group").notNull(),
    weights: jsonb("weights").$type<Record<string, number>>().notNull(),
    updatedBy: uuid("updated_by").references(() => users.id, { onDelete: "set null" }),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("rating_profiles_club_group_uq").on(t.clubId, t.positionGroup)],
);

export const ratingSettings = pgTable("rating_settings", {
  clubId: uuid("club_id").primaryKey().references(() => clubs.id, { onDelete: "cascade" }),
  // Weight of the in-game (EA) match rating when it is available, 0..1.
  externalRatingWeight: integer("external_rating_weight_pct").notNull().default(50),
  // Minimum share of club matches a player must have played to be eligible for "best" awards.
  minMatchesPct: integer("min_matches_pct").notNull().default(30),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
