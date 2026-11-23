/**
 * Ascend Performance Lab — per-player development data.
 * Match statistics are NOT duplicated here: analyses read player_statistics/match_players.
 * These tables only hold what the player creates (builds, plans) and the development timeline.
 */
import { boolean, date, index, jsonb, pgTable, smallint, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { players } from "./squad";
import { users } from "./core";

export type LabAttrValue = { initial: number | null; planned: number | null };
export type LabGoal = { id: string; text: string; metric?: string | null; target?: number | null; direction?: "up" | "down" | null; done: boolean; doneAt?: string | null };

/** A saved Pro Clubs build (planning document — never claims in-game validation unless costs are verified). */
export const labBuilds = pgTable(
  "lab_builds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playerId: uuid("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    gameVersion: text("game_version").notNull(),
    archetype: text("archetype"),
    level: smallint("level"),
    position: text("position"),
    role: text("role"),
    heightCm: smallint("height_cm"),
    weightKg: smallint("weight_kg"),
    pointsAvailable: smallint("points_available"),
    attributes: jsonb("attributes").$type<Record<string, LabAttrValue>>().notNull().default({}),
    playstyles: jsonb("playstyles").$type<{ key: string; plus: boolean }[]>().notNull().default([]),
    specializations: text("specializations"),
    notes: text("notes"),
    /** Generator brief and explanation, kept so the reasoning stays visible later. */
    brief: text("brief"),
    focusTopic: text("focus_topic"),
    isPrimary: boolean("is_primary").notNull().default(false),
    startedUsingOn: date("started_using_on"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("lab_builds_player_idx").on(t.playerId)],
);

/** A training plan created from the Smart Trainer (or from an automatic insight). */
export const labPlans = pgTable(
  "lab_plans",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playerId: uuid("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
    topic: text("topic").notNull(),
    variant: text("variant"),
    origin: text("origin").notNull().default("trainer"), // trainer | insight
    goals: jsonb("goals").$type<LabGoal[]>().notNull().default([]),
    /** Metric values when the plan was created (for later comparison). */
    baseline: jsonb("baseline").$type<Record<string, number | null>>().notNull().default({}),
    status: text("status").notNull().default("active"), // active | done | archived
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("lab_plans_player_idx").on(t.playerId)],
);

/** Development timeline (build saved, plan created, goal completed, build put into use…). */
export const labEvents = pgTable(
  "lab_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playerId: uuid("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("lab_events_player_idx").on(t.playerId, t.createdAt)],
);
