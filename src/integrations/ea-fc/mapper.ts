import { matchResult } from "@/lib/domain";
import type { EaMatch, EaPlayerStats } from "./types";

export type MappedPlayerLine = {
  eaName: string;
  goals: number;
  assists: number;
  shots: number | null;
  shotsOnTarget: null; // not provided by EA
  passesAttempted: number | null;
  passesCompleted: number | null;
  tackles: number | null;
  interceptions: null;
  clearances: null;
  saves: number | null;
  goalsConceded: number | null;
  cleanSheet: boolean | null;
  yellowCards: null;
  redCards: number | null;
  externalRating: number | null;
  isMotm: boolean | null;
  /** Stored on match_players, not player_statistics. */
  minutesPlayed: number | null;
};

export type MappedMatch = {
  externalId: string;
  kickoffAt: Date;
  opponentName: string;
  goalsFor: number;
  goalsAgainst: number;
  result: "W" | "D" | "L";
  players: MappedPlayerLine[];
};

const int = (v: number | null | undefined, max = 1000) =>
  v == null || !Number.isFinite(v) || v < 0 ? null : Math.min(Math.trunc(v), max);

export function mapPlayer(name: string, s: EaPlayerStats): MappedPlayerLine {
  let attempted = int(s.passattempts, 400);
  let completed = int(s.passesmade, 400);
  if (attempted != null && completed != null && completed > attempted) {
    // inconsistent source data → keep neither rather than store a wrong number
    attempted = null;
    completed = null;
  }
  const rating = s.rating == null || s.rating < 0 || s.rating > 10 ? null : Math.round(s.rating * 10) / 10;
  return {
    eaName: (s.playername ?? name).trim(),
    goals: int(s.goals, 30) ?? 0,
    assists: int(s.assists, 30) ?? 0,
    shots: int(s.shots, 200),
    shotsOnTarget: null,
    passesAttempted: attempted,
    passesCompleted: completed,
    tackles: int(s.tacklesmade, 200),
    interceptions: null,
    clearances: null,
    saves: int(s.saves, 200),
    goalsConceded: int(s.goalsconceded, 50),
    cleanSheet: s.cleansheetsany == null ? null : s.cleansheetsany > 0,
    yellowCards: null,
    redCards: s.redcards == null ? null : Math.min(int(s.redcards, 1) ?? 0, 1),
    externalRating: rating,
    isMotm: s.mom == null ? null : s.mom > 0,
    minutesPlayed: s.secondsPlayed == null || s.secondsPlayed < 0 ? null : Math.min(Math.round(s.secondsPlayed / 60), 130),
  };
}

/** Maps a raw EA match to our perspective. Returns null (with reason) when it is not usable. */
export function mapMatch(m: EaMatch, ourEaClubId: string): { ok: true; match: MappedMatch } | { ok: false; reason: string } {
  const ours = m.clubs[ourEaClubId];
  if (!ours) return { ok: false, reason: "partida não envolve o clube configurado" };
  const otherId = Object.keys(m.clubs).find((k) => k !== ourEaClubId);
  if (!otherId) return { ok: false, reason: "adversário ausente" };
  const theirs = m.clubs[otherId];
  const gf = int(ours.goals ?? ours.score, 99);
  const ga = int(theirs.goals ?? theirs.score, 99);
  if (gf == null || ga == null) return { ok: false, reason: "placar ausente" };
  if (m.timestamp == null) return { ok: false, reason: "data ausente" };
  const kickoffAt = new Date(m.timestamp * (m.timestamp < 1e12 ? 1000 : 1));
  if (Number.isNaN(kickoffAt.getTime())) return { ok: false, reason: "data inválida" };
  const players = Object.entries(m.players?.[ourEaClubId] ?? {}).map(([k, s]) => mapPlayer(k, s));
  return {
    ok: true,
    match: {
      externalId: m.matchId,
      kickoffAt,
      opponentName: theirs.details?.name?.trim() || `Clube EA ${otherId}`,
      goalsFor: gf,
      goalsAgainst: ga,
      result: matchResult(gf, ga),
      players,
    },
  };
}

/** EA "favoritePosition" is only a line (goalkeeper/defender/…); this is a starting point the staff should refine. */
export const EA_LINE_TO_POSITION = { goalkeeper: "GK", defender: "CB", midfielder: "CM", forward: "ST" } as const;
