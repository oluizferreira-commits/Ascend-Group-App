import { sql } from "drizzle-orm";
import { check, customType, index, integer, pgTable, smallint, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { clubs, users } from "./core";
import { applicationStatusEnum, fieldPositionEnumRef, preferredFootEnum } from "./enums";
import { players } from "./squad";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({ dataType: () => "bytea" });

/** "Seja do Ascend" — public transfer/tryout applications. Contact data is visible to staff only. */
export const transferApplications = pgTable(
  "transfer_applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
    status: applicationStatusEnum("status").notNull().default("new"),
    fullName: text("full_name").notNull(),
    age: smallint("age"),
    location: text("location"),
    eaName: text("ea_name").notNull(),
    platform: text("platform").notNull(),
    primaryPosition: fieldPositionEnumRef("primary_position").notNull(),
    secondaryPositions: fieldPositionEnumRef("secondary_positions").array().notNull().default(sql`'{}'::field_position[]`),
    overall: smallint("overall"),
    preferredFoot: preferredFootEnum("preferred_foot"),
    playStyle: text("play_style"),
    availability: text("availability"),
    previousClubs: text("previous_clubs"),
    contactWhatsapp: text("contact_whatsapp"),
    contactDiscord: text("contact_discord"),
    contactEmail: text("contact_email"),
    contactInstagram: text("contact_instagram"),
    videoUrl: text("video_url"),
    message: text("message"),
    hasPhoto: integer("has_photo").notNull().default(0),
    consentAt: timestamp("consent_at", { withTimezone: true }).notNull(),
    ipHash: text("ip_hash"),
    staffNotes: text("staff_notes"),
    playerId: uuid("player_id").references(() => players.id, { onDelete: "set null" }),
    reviewedBy: uuid("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("applications_club_status_idx").on(t.clubId, t.status, t.createdAt),
    index("applications_ip_time_idx").on(t.ipHash, t.createdAt),
    check("applications_age_range", sql`${t.age} is null or ${t.age} between 10 and 99`),
    check("applications_overall_range", sql`${t.overall} is null or ${t.overall} between 1 and 99`),
    check(
      "applications_has_contact",
      sql`coalesce(${t.contactWhatsapp}, ${t.contactDiscord}, ${t.contactEmail}, ${t.contactInstagram}) is not null`,
    ),
  ],
);

/** Pro Clubs avatar screenshot, stored re-encoded (WebP ≤ 800 px) — kept apart so list queries stay light. */
export const applicationPhotos = pgTable("application_photos", {
  applicationId: uuid("application_id").primaryKey().references(() => transferApplications.id, { onDelete: "cascade" }),
  mime: text("mime").notNull(),
  data: bytea("data").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
