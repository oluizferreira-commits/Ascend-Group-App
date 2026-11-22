import { index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { users } from "./core";
import { players } from "./squad";
import { matches } from "./sport";
import { announcements } from "./comms";

/** "Craque da partida" — one vote per member per match (players and staff all vote). */
export const matchMvpVotes = pgTable(
  "match_mvp_votes",
  {
    matchId: uuid("match_id").notNull().references(() => matches.id, { onDelete: "cascade" }),
    voterUserId: uuid("voter_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    playerId: uuid("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.matchId, t.voterUserId] }), index("mvp_votes_match_player_idx").on(t.matchId, t.playerId)],
);

/** Quick poll attached to an announcement. */
export const announcementPolls = pgTable("announcement_polls", {
  announcementId: uuid("announcement_id").primaryKey().references(() => announcements.id, { onDelete: "cascade" }),
  question: text("question").notNull(),
  options: jsonb("options").$type<string[]>().notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const pollVotes = pgTable(
  "poll_votes",
  {
    announcementId: uuid("announcement_id").notNull().references(() => announcementPolls.announcementId, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    optionIndex: integer("option_index").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.announcementId, t.userId] })],
);

/** Idempotency for automatic reminders ("match1h:<id>", "callup:<eventId>", "mvp:<matchId>"). */
export const remindersSent = pgTable(
  "reminders_sent",
  {
    key: text("key").primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("reminders_sent_key_uq").on(t.key)],
);
