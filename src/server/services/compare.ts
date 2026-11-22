import "server-only";
import { and, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";

/** How the team did when both players played, and when only one of them did. */
export async function togetherStats(clubId: string, a: string, b: string, seasonId: string | null) {
  const rows = await db
    .select({ matchId: schema.matches.id, playerId: schema.playerStatistics.playerId, gf: schema.matches.goalsFor, ga: schema.matches.goalsAgainst })
    .from(schema.playerStatistics)
    .innerJoin(schema.matches, eq(schema.matches.id, schema.playerStatistics.matchId))
    .where(and(eq(schema.matches.clubId, clubId), eq(schema.matches.status, "finished"), inArray(schema.playerStatistics.playerId, [a, b]),
      seasonId ? eq(schema.matches.seasonId, seasonId) : undefined));
  const byMatch = new Map<string, { gf: number; ga: number; who: Set<string> }>();
  for (const r of rows) {
    const m = byMatch.get(r.matchId) ?? { gf: r.gf!, ga: r.ga!, who: new Set<string>() };
    m.who.add(r.playerId);
    byMatch.set(r.matchId, m);
  }
  const bucket = (pred: (w: Set<string>) => boolean) => {
    const ms = [...byMatch.values()].filter((m) => pred(m.who));
    const w = ms.filter((m) => m.gf > m.ga).length, d = ms.filter((m) => m.gf === m.ga).length;
    return {
      played: ms.length, wins: w, draws: d, losses: ms.length - w - d,
      gf: ms.reduce((x, m) => x + m.gf, 0), ga: ms.reduce((x, m) => x + m.ga, 0),
      pointsPct: ms.length ? Math.round(((w * 3 + d) / (ms.length * 3)) * 1000) / 10 : null,
    };
  };
  return {
    together: bucket((w) => w.has(a) && w.has(b)),
    onlyA: bucket((w) => w.has(a) && !w.has(b)),
    onlyB: bucket((w) => w.has(b) && !w.has(a)),
  };
}
