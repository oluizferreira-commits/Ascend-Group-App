import { pgEnum } from "drizzle-orm/pg-core";

export const roleKeyEnum = pgEnum("role_key", [
  "president",
  "admin",
  "coach",
  "assistant_coach",
  "analyst",
  "player",
  "visitor",
]);

export const playerStatusEnum = pgEnum("player_status", [
  "starter",
  "reserve",
  "available",
  "unavailable",
  "sidelined",
  "inactive",
]);

export const preferredFootEnum = pgEnum("preferred_foot", ["right", "left", "both"]);

export const positionEnum = pgEnum("field_position", [
  "GK",
  "CB", "LB", "RB", "LWB", "RWB",
  "CDM", "CM", "CAM", "LM", "RM",
  "LW", "RW", "CF", "ST",
]);

export const positionGroupEnum = pgEnum("position_group", ["GK", "DEF", "MID", "ATT"]);

export const matchStatusEnum = pgEnum("match_status", ["scheduled", "finished", "cancelled"]);
export const dataSourceEnum = pgEnum("data_source", ["manual", "ea_fc", "file_import"]);
export const matchPlayerRoleEnum = pgEnum("match_player_role", ["starter", "substitute", "unused"]);

export const competitionFormatEnum = pgEnum("competition_format", [
  "league",
  "knockout",
  "groups_knockout",
  "friendly",
  "ea_division",
]);

export const eventTypeEnum = pgEnum("event_type", ["match", "training", "meeting", "other"]);
export const attendanceStatusEnum = pgEnum("attendance_status", [
  "pending",
  "confirmed",
  "declined",
  "present",
  "absent",
]);
export const availabilityStatusEnum = pgEnum("availability_status", ["available", "unavailable", "doubtful"]);

export const announcementCategoryEnum = pgEnum("announcement_category", [
  "administrative",
  "callup",
  "match_schedule",
  "calendar_change",
  "coaching_staff",
  "general",
]);
export const announcementPriorityEnum = pgEnum("announcement_priority", ["low", "normal", "high", "urgent"]);
export const visibilityEnum = pgEnum("visibility", ["public", "members", "staff"]);

export const syncStatusEnum = pgEnum("sync_status", ["running", "success", "partial", "failed"]);
export const syncTriggerEnum = pgEnum("sync_trigger", ["manual", "scheduled", "file"]);
