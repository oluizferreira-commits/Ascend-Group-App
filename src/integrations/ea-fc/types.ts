/**
 * EA SPORTS FC Pro Clubs — unofficial public read endpoints (proclubs.ea.com).
 * The response shape below is based on the format used by FC 24/FC 25 and is
 * parsed leniently: every unknown/missing field becomes null, never a guess.
 * VERIFY against real FC 27 samples (see docs/EA_FC_INTEGRATION.md).
 */
import { z } from "zod";

export const EA_PLATFORMS = ["common-gen5", "common-gen4"] as const;
export type EaPlatform = (typeof EA_PLATFORMS)[number];
export const EA_PLATFORM_LABELS: Record<EaPlatform, string> = {
  "common-gen5": "Nova geração (PS5 / Xbox Series / PC)",
  "common-gen4": "Geração anterior (PS4 / Xbox One)",
};

export const EA_MATCH_TYPES = ["leagueMatch", "playoffMatch", "friendlyMatch"] as const;
export type EaMatchType = (typeof EA_MATCH_TYPES)[number];
export const EA_MATCH_TYPE_LABELS: Record<EaMatchType, string> = {
  leagueMatch: "EA · Liga (divisões)",
  playoffMatch: "EA · Playoffs",
  friendlyMatch: "EA · Amistosos",
};

/** "12" | 12 | "" | undefined → number | null */
const num = z.preprocess((v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(",", "."));
  return Number.isFinite(n) ? n : null;
}, z.number().nullable());

const str = z.preprocess((v) => (v === null || v === undefined ? null : String(v)), z.string().nullable());

export const eaPlayerStatsSchema = z.looseObject({
  playername: str.optional(),
  goals: num.optional(),
  assists: num.optional(),
  shots: num.optional(),
  passesmade: num.optional(),
  passattempts: num.optional(),
  tacklesmade: num.optional(),
  saves: num.optional(),
  goalsconceded: num.optional(),
  cleansheetsany: num.optional(),
  redcards: num.optional(),
  rating: num.optional(),
  mom: num.optional(),
  pos: str.optional(),
  secondsPlayed: num.optional(),
});
export type EaPlayerStats = z.infer<typeof eaPlayerStatsSchema>;

export const eaClubSideSchema = z.looseObject({
  goals: num.optional(),
  score: num.optional(),
  details: z.looseObject({ name: str.optional() }).nullable().optional(),
});

export const eaMatchSchema = z.looseObject({
  matchId: z.union([z.string(), z.number()]).transform(String),
  timestamp: num,
  matchType: str.optional(),
  clubs: z.record(z.string(), eaClubSideSchema),
  players: z.record(z.string(), z.record(z.string(), eaPlayerStatsSchema)).optional().default({}),
});
export type EaMatch = z.infer<typeof eaMatchSchema>;

export const eaMatchListSchema = z.array(eaMatchSchema).max(200);

/** members/stats → { members: [...] } (FC 27, verified Nov 2026). */
export const eaMemberSchema = z.looseObject({
  name: z.string(),
  proName: str.optional(),
  favoritePosition: str.optional(),
  proOverall: num.optional(),
  gamesPlayed: num.optional(),
  goals: num.optional(),
  assists: num.optional(),
});
export const eaMembersResponseSchema = z.looseObject({ members: z.array(eaMemberSchema).max(200) });
export type EaMember = z.infer<typeof eaMemberSchema>;
