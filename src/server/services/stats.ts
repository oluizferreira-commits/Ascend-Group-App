import "server-only";
import { and, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { POSITION_GROUPS, matchResult, positionGroup, type Position, type PositionGroup } from "@/lib/domain";
import {
  DEFAULT_WEIGHTS, buildRankings, computeMatchRating, summarizeSeason,
  type MatchStatLine, type PlayerSeasonSummary, type Weights,
} from "@/lib/rating";

export async function getRatingConfig(clubId: string) {
  const profiles = await db.select().from(schema.ratingProfiles).where(eq(schema.ratingProfiles.clubId, clubId));
  const [settings] = await db.select().from(schema.ratingSettings).where(eq(schema.ratingSettings.clubId, clubId));
  const weights = Object.fromEntries(
    POSITION_GROUPS.map((g) => [g, (profiles.find((p) => p.positionGroup === g)?.weights as Weights) ?? DEFAULT_WEIGHTS[g]]),
  ) as Record<PositionGroup, Weights>;
  return {
    weights,
    externalWeight: (settings?.externalRatingWeight ?? 50) / 100,
    minMatchesPct: settings?.minMatchesPct ?? 30,
  };
}

type Scope = { clubId: string; seasonId?: string | null; competitionId?: string | null };

function matchFilter({ clubId, seasonId, competitionId }: Scope) {
  return and(
    eq(schema.matches.clubId, clubId),
    eq(schema.matches.status, "finished"),
    seasonId ? eq(schema.matches.seasonId, seasonId) : undefined,
    competitionId ? eq(schema.matches.competitionId, competitionId) : undefined,
  );
}

export async function clubRecord(scope: Scope) {
  const rows = await db
    .select({ gf: schema.matches.goalsFor, ga: schema.matches.goalsAgainst })
    .from(schema.matches)
    .where(matchFilter(scope));
  const played = rows.length;
  let w = 0, d = 0, l = 0, gf = 0, ga = 0;
  for (const r of rows) {
    const res = matchResult(r.gf!, r.ga!);
    if (res === "W") w++; else if (res === "D") d++; else l++;
    gf += r.gf!; ga += r.ga!;
  }
  return {
    played, wins: w, draws: d, losses: l, goalsFor: gf, goalsAgainst: ga,
    // Aproveitamento: pontos conquistados / pontos disputados (3 por jogo)
    pointsPct: played ? Math.round(((w * 3 + d) / (played * 3)) * 1000) / 10 : null,
  };
}

export type PlayerLite = {
  id: string; nickname: string; fullName: string; avatarUrl: string | null;
  primaryPosition: Position; shirtNumber: number | null; status: string;
};

/** Raw stat lines per player for the scope (one line per match played). */
async function loadLines(scope: Scope) {
  const rows = await db
    .select({
      playerId: schema.playerStatistics.playerId,
      matchId: schema.matches.id,
      kickoffAt: schema.matches.kickoffAt,
      opponent: schema.matches.opponentName,
      gf: schema.matches.goalsFor,
      ga: schema.matches.goalsAgainst,
      s: schema.playerStatistics,
    })
    .from(schema.playerStatistics)
    .innerJoin(schema.matches, eq(schema.matches.id, schema.playerStatistics.matchId))
    .where(matchFilter(scope))
    .orderBy(schema.matches.kickoffAt);
  const byPlayer = new Map<string, { line: MatchStatLine; matchId: string; kickoffAt: Date; opponent: string }[]>();
  for (const r of rows) {
    const line: MatchStatLine = { ...r.s, result: matchResult(r.gf!, r.ga!) };
    const arr = byPlayer.get(r.playerId) ?? [];
    arr.push({ line, matchId: r.matchId, kickoffAt: r.kickoffAt, opponent: r.opponent });
    byPlayer.set(r.playerId, arr);
  }
  return byPlayer;
}

export type SeasonStats = Awaited<ReturnType<typeof getSeasonStats>>;

export async function getSeasonStats(scope: Scope) {
  const [config, record, lines, players] = await Promise.all([
    getRatingConfig(scope.clubId),
    clubRecord(scope),
    loadLines(scope),
    db.select({
      id: schema.players.id, nickname: schema.players.nickname, fullName: schema.players.fullName,
      avatarUrl: schema.players.avatarUrl, primaryPosition: schema.players.primaryPosition,
      shirtNumber: schema.players.shirtNumber, status: schema.players.status,
    }).from(schema.players).where(eq(schema.players.clubId, scope.clubId)),
  ]);
  const summaries: PlayerSeasonSummary[] = players.map((p) =>
    summarizeSeason(
      { playerId: p.id, group: positionGroup(p.primaryPosition), lines: (lines.get(p.id) ?? []).map((x) => x.line) },
      config.weights,
      config.externalWeight,
    ),
  );
  const rankings = buildRankings(summaries, record.played, config.minMatchesPct);
  const playerMap = new Map(players.map((p) => [p.id, p as PlayerLite]));
  const summaryMap = new Map(summaries.map((s) => [s.playerId, s]));
  return { config, record, summaries, summaryMap, rankings, playerMap };
}

/** Match-by-match history for a single player with computed ratings. */
export async function getPlayerMatchHistory(clubId: string, playerId: string, seasonId?: string | null) {
  const [config, lines, [player]] = await Promise.all([
    getRatingConfig(clubId),
    loadLines({ clubId, seasonId }),
    db.select({ primaryPosition: schema.players.primaryPosition }).from(schema.players)
      .where(and(eq(schema.players.id, playerId), eq(schema.players.clubId, clubId))),
  ]);
  if (!player) return [];
  const group = positionGroup(player.primaryPosition);
  return (lines.get(playerId) ?? []).map((x) => ({
    ...x,
    rating: computeMatchRating(x.line, config.weights[group], config.externalWeight),
  }));
}

/** Per-season totals for a player (career history). */
export async function getPlayerSeasonHistory(clubId: string, playerId: string) {
  return db
    .select({
      seasonId: schema.seasons.id,
      seasonName: sql<string>`coalesce(${schema.seasons.name}, 'Sem temporada')`,
      matches: sql<number>`count(*)::int`,
      goals: sql<number>`coalesce(sum(${schema.playerStatistics.goals}),0)::int`,
      assists: sql<number>`coalesce(sum(${schema.playerStatistics.assists}),0)::int`,
      wins: sql<number>`count(*) filter (where ${schema.matches.goalsFor} > ${schema.matches.goalsAgainst})::int`,
      draws: sql<number>`count(*) filter (where ${schema.matches.goalsFor} = ${schema.matches.goalsAgainst})::int`,
      losses: sql<number>`count(*) filter (where ${schema.matches.goalsFor} < ${schema.matches.goalsAgainst})::int`,
    })
    .from(schema.playerStatistics)
    .innerJoin(schema.matches, eq(schema.matches.id, schema.playerStatistics.matchId))
    .leftJoin(schema.seasons, eq(schema.seasons.id, schema.matches.seasonId))
    .where(and(eq(schema.playerStatistics.playerId, playerId), eq(schema.matches.clubId, clubId), eq(schema.matches.status, "finished")))
    .groupBy(schema.seasons.id, schema.seasons.name, schema.seasons.startsOn)
    .orderBy(sql`${schema.seasons.startsOn} desc nulls last`);
}
