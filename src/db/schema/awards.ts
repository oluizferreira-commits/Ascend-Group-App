import { date, index, integer, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { clubs, users } from "./core";
import { players } from "./squad";

export const awardKindEnum = pgEnum("award_kind", ["silver", "gold"]);

/** One edition of the Bola de Prata (week) or Bola de Ouro (month). Winners are frozen forever once finalised. */
export const awardEditions = pgTable(
  "award_editions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
    kind: awardKindEnum("kind").notNull(),
    label: text("label").notNull(),
    periodStart: date("period_start").notNull(),
    periodEnd: date("period_end").notNull(),
    votingOpensAt: timestamp("voting_opens_at", { withTimezone: true }).notNull(),
    votingClosesAt: timestamp("voting_closes_at", { withTimezone: true }).notNull(),
    // Frozen result (kept even if the player later leaves the club).
    winnerPlayerId: uuid("winner_player_id").references(() => players.id, { onDelete: "set null" }),
    winnerName: text("winner_name"),
    winnerShirt: integer("winner_shirt"),
    winnerVotes: integer("winner_votes"),
    totalVotes: integer("total_votes"),
    finalizedAt: timestamp("finalized_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("award_editions_period_uq").on(t.clubId, t.kind, t.periodStart),
    index("award_editions_club_close_idx").on(t.clubId, t.votingClosesAt),
  ],
);

export const awardVotes = pgTable(
  "award_votes",
  {
    editionId: uuid("edition_id").notNull().references(() => awardEditions.id, { onDelete: "cascade" }),
    voterUserId: uuid("voter_user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    playerId: uuid("player_id").notNull().references(() => players.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.editionId, t.voterUserId] }), index("award_votes_edition_player_idx").on(t.editionId, t.playerId)],
);
