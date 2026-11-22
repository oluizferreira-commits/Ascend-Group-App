import "server-only";
import { and, asc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";

/** Copies a finished club match's score into any competition fixture linked to it. */
export async function syncFixturesFromMatch(clubId: string, matchId: string) {
  const [m] = await db.select().from(schema.matches).where(and(eq(schema.matches.id, matchId), eq(schema.matches.clubId, clubId)));
  if (!m) return;
  const fixtures = await db.select({ f: schema.competitionFixtures, homeOwn: schema.competitionTeams.isOwnClub })
    .from(schema.competitionFixtures)
    .innerJoin(schema.competitionTeams, eq(schema.competitionTeams.id, schema.competitionFixtures.homeTeamId))
    .where(eq(schema.competitionFixtures.matchId, matchId));
  for (const { f, homeOwn } of fixtures) {
    const done = m.status === "finished";
    await db.update(schema.competitionFixtures).set({
      homeGoals: done ? (homeOwn ? m.goalsFor : m.goalsAgainst) : null,
      awayGoals: done ? (homeOwn ? m.goalsAgainst : m.goalsFor) : null,
      scheduledAt: m.kickoffAt,
    }).where(eq(schema.competitionFixtures.id, f.id));
  }
}

export async function getCompetition(clubId: string, id: string) {
  const [c] = await db.select({ c: schema.competitions, season: schema.seasons.name }).from(schema.competitions)
    .leftJoin(schema.seasons, eq(schema.seasons.id, schema.competitions.seasonId))
    .where(and(eq(schema.competitions.id, id), eq(schema.competitions.clubId, clubId)));
  if (!c) return null;
  const [teams, fixtures, standings, scorers] = await Promise.all([
    db.select().from(schema.competitionTeams).where(eq(schema.competitionTeams.competitionId, id)).orderBy(asc(schema.competitionTeams.name)),
    db.select().from(schema.competitionFixtures).where(eq(schema.competitionFixtures.competitionId, id))
      .orderBy(sql`${schema.competitionFixtures.scheduledAt} asc nulls last`, asc(schema.competitionFixtures.round)),
    db.execute<{ team_id: string; team_name: string; is_own_club: boolean; group_name: string | null; played: number; won: number; drawn: number; lost: number; goals_for: number; goals_against: number; goal_difference: number; points: number }>(
      sql`select * from standings where competition_id = ${id} order by group_name nulls first, points desc, goal_difference desc, goals_for desc, team_name`),
    db.select({
      playerId: schema.players.id, nickname: schema.players.nickname,
      goals: sql<number>`sum(${schema.playerStatistics.goals})::int`, assists: sql<number>`sum(${schema.playerStatistics.assists})::int`,
      matches: sql<number>`count(*)::int`,
    }).from(schema.playerStatistics)
      .innerJoin(schema.matches, eq(schema.matches.id, schema.playerStatistics.matchId))
      .innerJoin(schema.players, eq(schema.players.id, schema.playerStatistics.playerId))
      .where(and(eq(schema.matches.competitionId, id), eq(schema.matches.status, "finished")))
      .groupBy(schema.players.id, schema.players.nickname)
      .orderBy(sql`sum(${schema.playerStatistics.goals}) desc`, sql`sum(${schema.playerStatistics.assists}) desc`).limit(20),
  ]);
  return { ...c.c, season: c.season, teams, fixtures, standings: [...standings], scorers };
}
