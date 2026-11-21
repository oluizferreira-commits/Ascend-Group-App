import { sql } from "drizzle-orm";
import { bigserial, boolean, check, date, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { clubs, users } from "./core";
import {
  announcementCategoryEnum, announcementPriorityEnum, attendanceStatusEnum, availabilityStatusEnum,
  eventTypeEnum, syncStatusEnum, syncTriggerEnum, visibilityEnum,
} from "./enums";
import { players } from "./squad";
import { matches } from "./sport";

export const calendarEvents = pgTable(
  "calendar_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
    type: eventTypeEnum("type").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    endsAt: timestamp("ends_at", { withTimezone: true }),
    matchId: uuid("match_id").references(() => matches.id, { onDelete: "cascade" }),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("calendar_events_club_time_idx").on(t.clubId, t.startsAt)],
);

/** Call-ups (convocações) and attendance for a calendar event. */
export const attendance = pgTable(
  "attendance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id").notNull().references(() => calendarEvents.id, { onDelete: "cascade" }),
    playerId: uuid("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
    status: attendanceStatusEnum("status").notNull().default("pending"),
    note: text("note"),
    respondedAt: timestamp("responded_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("attendance_event_player_uq").on(t.eventId, t.playerId)],
);

export const playerAvailability = pgTable(
  "player_availability",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    playerId: uuid("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
    status: availabilityStatusEnum("status").notNull(),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on"),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("availability_player_idx").on(t.playerId, t.startsOn),
    check("availability_range", sql`${t.endsOn} is null or ${t.endsOn} >= ${t.startsOn}`),
  ],
);

export const announcements = pgTable(
  "announcements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    category: announcementCategoryEnum("category").notNull().default("general"),
    priority: announcementPriorityEnum("priority").notNull().default("normal"),
    visibility: visibilityEnum("visibility").notNull().default("members"),
    pinned: boolean("pinned").notNull().default(false),
    publishedAt: timestamp("published_at", { withTimezone: true }).notNull().defaultNow(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("announcements_club_pub_idx").on(t.clubId, t.publishedAt),
    check("announcements_expiry", sql`${t.expiresAt} is null or ${t.expiresAt} > ${t.publishedAt}`),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    clubId: uuid("club_id").references(() => clubs.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body"),
    link: text("link"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("notifications_user_unread_idx").on(t.userId, t.readAt, t.createdAt)],
);

export const mediaAssets = pgTable("media_assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  clubId: uuid("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
  template: text("template").notNull(),
  format: text("format").notNull(),
  title: text("title").notNull(),
  filePath: text("file_path"),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
  createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const synchronizationLogs = pgTable(
  "synchronization_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
    provider: text("provider").notNull(),
    trigger: syncTriggerEnum("trigger").notNull(),
    status: syncStatusEnum("status").notNull().default("running"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    itemsFound: integer("items_found").notNull().default(0),
    itemsCreated: integer("items_created").notNull().default(0),
    itemsSkipped: integer("items_skipped").notNull().default(0),
    errorMessage: text("error_message"),
    details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
    triggeredBy: uuid("triggered_by").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => [index("sync_logs_club_time_idx").on(t.clubId, t.startedAt)],
);

/** Append-only: UPDATE/DELETE are blocked by a trigger (see migration 0001). */
export const auditLogs = pgTable(
  "audit_logs",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    clubId: uuid("club_id").references(() => clubs.id, { onDelete: "set null" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_logs_club_time_idx").on(t.clubId, t.createdAt)],
);
