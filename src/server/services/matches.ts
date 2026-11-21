import "server-only";
import { and, asc, desc, eq, gte, ilike, sql } from "drizzle-orm";
import { db, schema } from "@/db";

export async function nextMatch(clubId: string) {
  const [m] = await db
    .select({ match: schema.matches, competition: schema.competitions.name })
    .from(schema.matches)
    .leftJoin(schema.competitions, eq(schema.competitions.id, schema.matches.competitionId))
    .where(and(eq(schema.matches.clubId, clubId), eq(schema.matches.status, "scheduled"), gte(schema.matches.kickoffAt, new Date(Date.now() - 3 * 3600_000))))
    .orderBy(asc(schema.matches.kickoffAt))
    .limit(1);
  return m ?? null;
}

export async function recentResults(clubId: string, limit = 5, seasonId?: string | null) {
  return db
    .select({ match: schema.matches, competition: schema.competitions.name })
    .from(schema.matches)
    .leftJoin(schema.competitions, eq(schema.competitions.id, schema.matches.competitionId))
    .where(and(eq(schema.matches.clubId, clubId), eq(schema.matches.status, "finished"), seasonId ? eq(schema.matches.seasonId, seasonId) : undefined))
    .orderBy(desc(schema.matches.kickoffAt))
    .limit(limit);
}

export type MatchFilters = { seasonId?: string; competitionId?: string; opponent?: string; status?: "scheduled" | "finished" | "cancelled" };

export async function listMatches(clubId: string, f: MatchFilters = {}) {
  return db
    .select({ match: schema.matches, competition: schema.competitions.name, season: schema.seasons.name })
    .from(schema.matches)
    .leftJoin(schema.competitions, eq(schema.competitions.id, schema.matches.competitionId))
    .leftJoin(schema.seasons, eq(schema.seasons.id, schema.matches.seasonId))
    .where(and(
      eq(schema.matches.clubId, clubId),
      f.seasonId ? eq(schema.matches.seasonId, f.seasonId) : undefined,
      f.competitionId ? eq(schema.matches.competitionId, f.competitionId) : undefined,
      f.status ? eq(schema.matches.status, f.status) : undefined,
      f.opponent ? ilike(schema.matches.opponentName, `%${f.opponent.replace(/[%_\\]/g, "\\$&")}%`) : undefined,
    ))
    .orderBy(desc(schema.matches.kickoffAt))
    .limit(300);
}

export async function headToHead(clubId: string) {
  return db
    .select({
      opponent: schema.matches.opponentName,
      played: sql<number>`count(*)::int`,
      wins: sql<number>`count(*) filter (where ${schema.matches.goalsFor} > ${schema.matches.goalsAgainst})::int`,
      draws: sql<number>`count(*) filter (where ${schema.matches.goalsFor} = ${schema.matches.goalsAgainst})::int`,
      losses: sql<number>`count(*) filter (where ${schema.matches.goalsFor} < ${schema.matches.goalsAgainst})::int`,
      gf: sql<number>`sum(${schema.matches.goalsFor})::int`,
      ga: sql<number>`sum(${schema.matches.goalsAgainst})::int`,
    })
    .from(schema.matches)
    .where(and(eq(schema.matches.clubId, clubId), eq(schema.matches.status, "finished")))
    .groupBy(schema.matches.opponentName)
    .orderBy(desc(sql`count(*)`))
    .limit(50);
}

export async function getMatchDetail(clubId: string, matchId: string) {
  const [row] = await db
    .select({ match: schema.matches, competition: schema.competitions.name, season: schema.seasons.name, formation: schema.formations.name })
    .from(schema.matches)
    .leftJoin(schema.competitions, eq(schema.competitions.id, schema.matches.competitionId))
    .leftJoin(schema.seasons, eq(schema.seasons.id, schema.matches.seasonId))
    .leftJoin(schema.formations, eq(schema.formations.id, schema.matches.formationId))
    .where(and(eq(schema.matches.id, matchId), eq(schema.matches.clubId, clubId)));
  if (!row) return null;
  const participants = await db
    .select({ mp: schema.matchPlayers, stats: schema.playerStatistics, player: schema.players })
    .from(schema.matchPlayers)
    .innerJoin(schema.players, eq(schema.players.id, schema.matchPlayers.playerId))
    .leftJoin(schema.playerStatistics, and(eq(schema.playerStatistics.matchId, schema.matchPlayers.matchId), eq(schema.playerStatistics.playerId, schema.matchPlayers.playerId)))
    .where(eq(schema.matchPlayers.matchId, matchId))
    .orderBy(asc(schema.matchPlayers.role), asc(schema.players.nickname));
  return { ...row, participants };
}
