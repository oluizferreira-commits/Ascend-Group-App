import "server-only";
import { and, asc, desc, eq, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSeasonStats } from "./stats";
import { notify } from "../notify";
import { AWARD_LABELS, editionStatus, pickWinner, plannedEditions, type AwardKind } from "@/lib/awards";
import type { AuthContext } from "../auth/session";

export type Edition = typeof schema.awardEditions.$inferSelect;

/** Creates the current/previous editions if missing (idempotent). */
export async function ensureEditions(clubId: string) {
  for (const p of plannedEditions(new Date())) {
    await db.insert(schema.awardEditions).values({ clubId, ...p }).onConflictDoNothing();
  }
}

async function claim(key: string) {
  const r = await db.insert(schema.remindersSent).values({ key }).onConflictDoNothing().returning({ key: schema.remindersSent.key });
  return r.length > 0;
}

/** Candidates (active roster + anyone who played in the period) with their numbers in the period. */
export async function editionCandidates(e: Edition) {
  const stats = await getSeasonStats({ clubId: e.clubId, from: e.periodStart, to: e.periodEnd });
  return [...stats.playerMap.values()]
    .map((p) => ({ player: p, s: stats.summaryMap.get(p.id)! }))
    .filter(({ player, s }) => player.status !== "inactive" || s.matches > 0)
    .sort((a, b) => b.s.goalInvolvements - a.s.goalInvolvements || (b.s.avgRating ?? -1) - (a.s.avgRating ?? -1) || a.player.nickname.localeCompare(b.player.nickname));
}

/** Opens / finalises editions and sends the related notifications. Safe to call often. */
export async function runAwards(clubId: string) {
  await ensureEditions(clubId);
  const now = new Date();
  const editions = await db.select().from(schema.awardEditions)
    .where(and(eq(schema.awardEditions.clubId, clubId), isNull(schema.awardEditions.finalizedAt), lte(schema.awardEditions.votingOpensAt, now)));
  for (const e of editions) {
    const status = editionStatus(e, now);
    if (status === "open" && (await claim(`award-open:${e.id}`))) {
      await notify(clubId, { kind: "members" }, {
        type: "award.open", title: `${e.kind === "gold" ? "🥇" : "🥈"} Votação aberta: ${AWARD_LABELS[e.kind]} · ${e.label}`,
        body: "Escolha o melhor do período — vote até o fim do prazo.", link: `/app/premios/${e.id}`,
      });
    }
    if (status === "closed") await finalize(e);
  }
}

async function finalize(e: Edition) {
  const [cands, votes] = await Promise.all([
    editionCandidates(e),
    db.select({ playerId: schema.awardVotes.playerId, n: sql<number>`count(*)::int` }).from(schema.awardVotes)
      .where(eq(schema.awardVotes.editionId, e.id)).groupBy(schema.awardVotes.playerId),
  ]);
  const vmap = new Map(votes.map((v) => [v.playerId, v.n]));
  const total = votes.reduce((a, v) => a + v.n, 0);
  const winner = pickWinner(cands.map((c) => ({ playerId: c.player.id, votes: vmap.get(c.player.id) ?? 0, avgRating: c.s.avgRating, involvements: c.s.goalInvolvements })));
  const wp = winner ? cands.find((c) => c.player.id === winner.playerId)!.player : null;
  const [done] = await db.update(schema.awardEditions).set({
    finalizedAt: new Date(), totalVotes: total,
    winnerPlayerId: wp?.id ?? null, winnerName: wp?.nickname ?? null, winnerShirt: wp?.shirtNumber ?? null, winnerVotes: winner?.votes ?? null,
  }).where(and(eq(schema.awardEditions.id, e.id), isNull(schema.awardEditions.finalizedAt))).returning();
  if (done && wp && (await claim(`award-result:${e.id}`))) {
    await notify(e.clubId, { kind: "members" }, {
      type: "award.result", title: `${e.kind === "gold" ? "🥇" : "🥈"} ${wp.nickname} é a ${AWARD_LABELS[e.kind]} · ${e.label}!`,
      body: `${winner!.votes} de ${total} votos. Fica registrado para sempre na história do Ascend.`, link: `/app/premios/${e.id}`,
    });
  }
}

export async function listEditions(clubId: string) {
  return db.select().from(schema.awardEditions).where(eq(schema.awardEditions.clubId, clubId)).orderBy(desc(schema.awardEditions.periodEnd), asc(schema.awardEditions.kind));
}

export async function getEdition(clubId: string, id: string) {
  const [e] = await db.select().from(schema.awardEditions).where(and(eq(schema.awardEditions.id, id), eq(schema.awardEditions.clubId, clubId)));
  return e ?? null;
}

export async function editionVotes(editionId: string, userId: string) {
  const rows = await db.select().from(schema.awardVotes).where(eq(schema.awardVotes.editionId, editionId));
  const counts = new Map<string, number>();
  for (const r of rows) counts.set(r.playerId, (counts.get(r.playerId) ?? 0) + 1);
  return { counts, total: rows.length, myVote: rows.find((r) => r.voterUserId === userId)?.playerId ?? null };
}

/** Trophy cabinet: number of Bolas per player. */
export async function trophies(clubId: string) {
  const rows = await db.select({ playerId: schema.awardEditions.winnerPlayerId, name: schema.awardEditions.winnerName, kind: schema.awardEditions.kind, n: sql<number>`count(*)::int` })
    .from(schema.awardEditions)
    .where(and(eq(schema.awardEditions.clubId, clubId), isNotNull(schema.awardEditions.winnerName)))
    .groupBy(schema.awardEditions.winnerPlayerId, schema.awardEditions.winnerName, schema.awardEditions.kind);
  const map = new Map<string, { name: string; gold: number; silver: number }>();
  for (const r of rows) {
    const key = r.playerId ?? `name:${r.name}`;
    const t = map.get(key) ?? { name: r.name!, gold: 0, silver: 0 };
    t[r.kind as AwardKind] += r.n;
    map.set(key, t);
  }
  return map;
}

export function canVote(ctx: AuthContext) {
  return ctx.permissions.has("dashboard.view");
}

/** Open edition where this member hasn't voted yet (dashboard prompt). */
export async function openAwardPrompt(ctx: AuthContext) {
  const now = new Date();
  const open = await db.select().from(schema.awardEditions).where(and(
    eq(schema.awardEditions.clubId, ctx.club.id), isNull(schema.awardEditions.finalizedAt), lte(schema.awardEditions.votingOpensAt, now),
  ));
  for (const e of open.filter((x) => x.votingClosesAt > now)) {
    const [v] = await db.select().from(schema.awardVotes).where(and(eq(schema.awardVotes.editionId, e.id), eq(schema.awardVotes.voterUserId, ctx.user.id)));
    if (!v) return e;
  }
  return null;
}

export async function playerTrophies(clubId: string, playerId: string) {
  return (await trophies(clubId)).get(playerId) ?? { name: "", gold: 0, silver: 0 };
}
