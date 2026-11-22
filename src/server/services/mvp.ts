import "server-only";
import { and, desc, eq, gt, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { mvpWindow, tally } from "@/lib/mvp";
import type { AuthContext } from "../auth/session";

export async function mvpCandidates(matchId: string) {
  const played = await db.select({ p: schema.players }).from(schema.playerStatistics)
    .innerJoin(schema.players, eq(schema.players.id, schema.playerStatistics.playerId))
    .where(eq(schema.playerStatistics.matchId, matchId));
  if (played.length) return played.map((r) => r.p);
  const listed = await db.select({ p: schema.players }).from(schema.matchPlayers)
    .innerJoin(schema.players, eq(schema.players.id, schema.matchPlayers.playerId))
    .where(and(eq(schema.matchPlayers.matchId, matchId), inArray(schema.matchPlayers.role, ["starter", "substitute"])));
  return listed.map((r) => r.p);
}

export async function getMvpVoting(ctx: AuthContext, matchId: string) {
  const [m] = await db.select().from(schema.matches).where(and(eq(schema.matches.id, matchId), eq(schema.matches.clubId, ctx.club.id)));
  if (!m || m.status !== "finished") return null;
  const candidates = await mvpCandidates(matchId);
  if (!candidates.length) return { match: m, candidates: [], open: false, closesAt: null, total: 0, counts: new Map<string, number>(), winners: [] as string[], myVote: null as string | null };
  const votes = await db.select().from(schema.matchMvpVotes).where(eq(schema.matchMvpVotes.matchId, matchId));
  const { closesAt } = mvpWindow(m.kickoffAt, m.createdAt);
  const t = tally(votes);
  return {
    match: m,
    candidates: candidates.sort((a, b) => (t.counts.get(b.id) ?? 0) - (t.counts.get(a.id) ?? 0) || a.nickname.localeCompare(b.nickname)),
    open: Date.now() < closesAt.getTime(),
    closesAt,
    total: t.total,
    counts: t.counts,
    winners: t.winners,
    myVote: votes.find((v) => v.voterUserId === ctx.user.id)?.playerId ?? null,
  };
}

/** Most recent finished match whose vote is open and where this member hasn't voted yet. */
export async function recentMvpPrompt(ctx: AuthContext) {
  const recent = await db.select().from(schema.matches).where(and(
    eq(schema.matches.clubId, ctx.club.id), eq(schema.matches.status, "finished"), gt(schema.matches.updatedAt, new Date(Date.now() - 48 * 3600_000)),
  )).orderBy(desc(schema.matches.kickoffAt)).limit(5);
  for (const m of recent) {
    if (Date.now() >= mvpWindow(m.kickoffAt, m.createdAt).closesAt.getTime()) continue;
    const [voted] = await db.select().from(schema.matchMvpVotes).where(and(eq(schema.matchMvpVotes.matchId, m.id), eq(schema.matchMvpVotes.voterUserId, ctx.user.id)));
    if (voted) continue;
    if ((await mvpCandidates(m.id)).length) return m;
  }
  return null;
}
