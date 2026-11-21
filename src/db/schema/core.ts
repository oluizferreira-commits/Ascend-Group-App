import { sql } from "drizzle-orm";
import {
  boolean, date, index, integer, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid,
} from "drizzle-orm/pg-core";
import { roleKeyEnum } from "./enums";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
};

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  motto: text("motto"),
  ...timestamps,
});

export const clubs = pgTable(
  "clubs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id").notNull().references(() => organizations.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    shortName: text("short_name"),
    crestPath: text("crest_path").notNull().default("/brand/ascend-fc-crest.png"),
    eaPlatform: text("ea_platform"),
    eaClubId: text("ea_club_id"),
    ...timestamps,
  },
  (t) => [uniqueIndex("clubs_org_slug_uq").on(t.organizationId, t.slug)],
);

export const seasons = pgTable(
  "seasons",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    clubId: uuid("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    startsOn: date("starts_on").notNull(),
    endsOn: date("ends_on"),
    isCurrent: boolean("is_current").notNull().default(false),
    division: text("division"),
    leaguePosition: integer("league_position"),
    ...timestamps,
  },
  (t) => [
    uniqueIndex("seasons_club_name_uq").on(t.clubId, t.name),
    // At most one current season per club.
    uniqueIndex("seasons_one_current_uq").on(t.clubId).where(sql`${t.isCurrent}`),
  ],
);

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    displayName: text("display_name").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    passwordChangedAt: timestamp("password_changed_at", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [uniqueIndex("users_email_lower_uq").on(sql`lower(${t.email})`)],
);

export const sessions = pgTable(
  "sessions",
  {
    // SHA-256 of the opaque token stored in the cookie; the raw token never hits the DB.
    id: text("id").primaryKey(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("sessions_user_idx").on(t.userId), index("sessions_expires_idx").on(t.expiresAt)],
);

export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: text("id").primaryKey(), // SHA-256 of the token
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("prt_user_idx").on(t.userId)],
);

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    ipAddress: text("ip_address"),
    success: boolean("success").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("login_attempts_email_time_idx").on(sql`lower(${t.email})`, t.createdAt)],
);

export const roles = pgTable("roles", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: roleKeyEnum("key").notNull().unique(),
  name: text("name").notNull(),
  // Higher rank = more authority. Used to stop users from granting roles above their own.
  rank: integer("rank").notNull(),
});

export const permissions = pgTable("permissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: text("key").notNull().unique(),
  description: text("description").notNull(),
});

export const rolePermissions = pgTable(
  "role_permissions",
  {
    roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: "cascade" }),
    permissionId: uuid("permission_id").notNull().references(() => permissions.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.roleId, t.permissionId] })],
);

export const memberships = pgTable(
  "memberships",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    clubId: uuid("club_id").notNull().references(() => clubs.id, { onDelete: "cascade" }),
    roleId: uuid("role_id").notNull().references(() => roles.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("memberships_user_club_role_uq").on(t.userId, t.clubId, t.roleId),
    index("memberships_club_idx").on(t.clubId),
  ],
);
