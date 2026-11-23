import "server-only";
import { cache } from "react";
import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { db, schema } from "@/db";
import type { AuthContext } from "../auth/session";
import { matchResult, positionGroup, type Position, type PositionGroup } from "@/lib/domain";
import { computeMatchRating } from "@/lib/rating";
import { getRatingConfig } from "./stats";
import { computeWindow, METRICS, metricsFor, windows, type LabMatch } from "@/lib/lab/metrics";
import { diagnose, METRIC_TOPIC, peerComparison, priorities } from "@/lib/lab/diagnostics";
import { achievements } from "@/lib/lab/progress";

export type LabPlayer = { id: string; nickname: string; primaryPosition: Position; shirtNumber: number | null; avatarUrl: string | null; userId: string | null };

/**
 * Who is being analysed and what the viewer may do.
 *  - A player sees and edits only their own Lab.
 *  - Staff with `reports.view` (presidência, administração, comissão técnica, analista) may open any
 *    player's Lab read-only. Nothing is ever shown to other squad members.
 */
export type LabSubject =
  | { kind: "player"; player: LabPlayer; own: boolean; canEdit: boolean; canPick: boolean }
  | { kind: "pick"; players: LabPlayer[] }
  | { kind: "none" };

const playerCols = {
  id: schema.players.id, nickname: schema.players.nickname, primaryPosition: schema.players.primaryPosition,
  shirtNumber: schema.players.shirtNumber, avatarUrl: schema.players.avatarUrl, userId: schema.players.userId,
};

export async function labSubject(ctx: AuthContext, requested?: string | null): Promise<LabSubject> {
  const staff = ctx.permissions.has("reports.view");
  const wanted = requested && /^[0-9a-f-]{36}$/i.test(requested) ? requested : null;
  if (wanted && wanted !== ctx.playerId) {
    if (!staff) return ctx.playerId ? labSubject(ctx, null) : { kind: "none" };
    const [p] = await db.select(playerCols).from(schema.players).where(and(eq(schema.players.id, wanted), eq(schema.players.clubId, ctx.club.id)));
    if (p) return { kind: "player", player: p, own: false, canEdit: false, canPick: true };
  }
  if (ctx.playerId) {
    const [p] = await db.select(playerCols).from(schema.players).where(eq(schema.players.id, ctx.playerId));
    if (p) return { kind: "player", player: p, own: true, canEdit: true, canPick: staff };
  }
  if (staff) return { kind: "pick", players: await listLabPlayers(ctx.club.id) };
  return { kind: "none" };
}

export async function listLabPlayers(clubId: string) {
  return db.select(playerCols).from(schema.players)
    .where(and(eq(schema.players.clubId, clubId), ne(schema.players.status, "inactive")))
    .orderBy(asc(schema.players.nickname));
}

/** Real match lines of the given players (finished matches only), oldest → newest. Rated with the club's system. */
async function loadLines(clubId: string, playerIds: string[]) {
  if (!playerIds.length) return new Map<string, LabMatch[]>();
  const [config, rows, pls] = await Promise.all([
    getRatingConfig(clubId),
    db.select({
      playerId: schema.playerStatistics.playerId, s: schema.playerStatistics,
      matchId: schema.matches.id, kickoffAt: schema.matches.kickoffAt, opponent: schema.matches.opponentName,
      gf: schema.matches.goalsFor, ga: schema.matches.goalsAgainst, minutes: schema.matchPlayers.minutesPlayed,
    })
      .from(schema.playerStatistics)
      .innerJoin(schema.matches, eq(schema.matches.id, schema.playerStatistics.matchId))
      .leftJoin(schema.matchPlayers, and(eq(schema.matchPlayers.matchId, schema.playerStatistics.matchId), eq(schema.matchPlayers.playerId, schema.playerStatistics.playerId)))
      .where(and(eq(schema.matches.clubId, clubId), eq(schema.matches.status, "finished"), inArray(schema.playerStatistics.playerId, playerIds)))
      .orderBy(asc(schema.matches.kickoffAt)),
    db.select({ id: schema.players.id, pos: schema.players.primaryPosition }).from(schema.players).where(inArray(schema.players.id, playerIds)),
  ]);
  const groupOf = new Map(pls.map((p) => [p.id, positionGroup(p.pos)]));
  const out = new Map<string, LabMatch[]>();
  for (const r of rows) {
    const result = matchResult(r.gf!, r.ga!);
    const g = groupOf.get(r.playerId) ?? "MID";
    const rating = computeMatchRating({ ...r.s, result }, config.weights[g], config.externalWeight).final;
    const list = out.get(r.playerId) ?? [];
    list.push({
      matchId: r.matchId, kickoffAt: r.kickoffAt, opponent: r.opponent, result, minutes: r.minutes, rating, source: r.s.source,
      s: {
        goals: r.s.goals, assists: r.s.assists, shots: r.s.shots, shotsOnTarget: r.s.shotsOnTarget,
        passesAttempted: r.s.passesAttempted, passesCompleted: r.s.passesCompleted,
        tackles: r.s.tackles, tacklesAttempted: r.s.tacklesAttempted, interceptions: r.s.interceptions, clearances: r.s.clearances,
        saves: r.s.saves, goalsConceded: r.s.goalsConceded, cleanSheet: r.s.cleanSheet, isMotm: r.s.isMotm,
      },
    });
    out.set(r.playerId, list);
  }
  return out;
}

export const labMatches = cache(async (clubId: string, playerId: string) => (await loadLines(clubId, [playerId])).get(playerId) ?? []);

/** Latest EA archetype id seen in the player's match data (raw id — names are not verified). */
export async function latestArchetypeId(playerId: string) {
  const [r] = await db.select({ extra: schema.playerStatistics.extra }).from(schema.playerStatistics)
    .innerJoin(schema.matches, eq(schema.matches.id, schema.playerStatistics.matchId))
    .where(and(eq(schema.playerStatistics.playerId, playerId), eq(schema.playerStatistics.source, "ea_fc")))
    .orderBy(desc(schema.matches.kickoffAt)).limit(1);
  const id = r?.extra?.archetypeId;
  return typeof id === "number" ? id : null;
}

/** Same-position teammates' lines (for fair comparisons). */
async function peerLines(clubId: string, group: PositionGroup, excludeId: string) {
  const all = await db.select({ id: schema.players.id, pos: schema.players.primaryPosition }).from(schema.players)
    .where(and(eq(schema.players.clubId, clubId), ne(schema.players.status, "inactive"), ne(schema.players.id, excludeId)));
  const ids = all.filter((p) => positionGroup(p.pos) === group).map((p) => p.id);
  return [...(await loadLines(clubId, ids)).values()];
}

/** Everything the "Visão geral" and "Análise" screens need — computed once per request. */
export const labAnalysis = cache(async (clubId: string, player: LabPlayer) => {
  const group = positionGroup(player.primaryPosition);
  const [matches, peers] = await Promise.all([labMatches(clubId, player.id), peerLines(clubId, group, player.id)]);
  const defs = metricsFor(group);
  const w = windows(matches);
  const table = defs.map((def) => ({ def, last1: computeWindow(def, w.last1), last5: computeWindow(def, w.last5), last10: computeWindow(def, w.last10), career: computeWindow(def, w.career) }));
  const insights = diagnose(matches, group);
  const peer = peerComparison(defs, matches, peers);
  const gaps = peer.filter((p) => p.position === "abaixo" && METRIC_TOPIC[p.def.key]).map((p) => ({ ...METRIC_TOPIC[p.def.key], weight: 1 }));
  return {
    group, matches, table, insights, peer, peersWithData: peers.filter((p) => p.length > 0).length,
    priorities: priorities(insights, gaps),
    achievements: achievements(matches),
    sources: { ea: matches.filter((m) => m.source === "ea_fc").length, manual: matches.filter((m) => m.source !== "ea_fc").length },
    period: matches.length ? { from: matches[0].kickoffAt, to: matches.at(-1)!.kickoffAt } : null,
  };
});

/** Current values used as the baseline when a plan is created (last 10 matches). */
export function baselineFor(matches: LabMatch[]) {
  const last10 = matches.slice(-10);
  return Object.fromEntries(METRICS.map((d) => [d.key, computeWindow(d, last10).value]));
}

export async function listBuilds(playerId: string) {
  return db.select().from(schema.labBuilds).where(eq(schema.labBuilds.playerId, playerId))
    .orderBy(desc(schema.labBuilds.isPrimary), desc(schema.labBuilds.updatedAt));
}

export async function getBuild(playerId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [b] = await db.select().from(schema.labBuilds).where(and(eq(schema.labBuilds.id, id), eq(schema.labBuilds.playerId, playerId)));
  return b ?? null;
}

export async function listPlans(playerId: string) {
  return db.select().from(schema.labPlans).where(eq(schema.labPlans.playerId, playerId)).orderBy(desc(schema.labPlans.createdAt));
}

export async function listEvents(playerId: string, limit = 50) {
  return db.select().from(schema.labEvents).where(eq(schema.labEvents.playerId, playerId)).orderBy(desc(schema.labEvents.createdAt)).limit(limit);
}
