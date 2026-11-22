import "server-only";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getSeasonStats } from "./stats";
import { getClubOverview } from "./club";
import { squadAttributes, cardOverall, type Attributes } from "@/lib/attributes";
import type { AuthContext } from "../auth/session";

export type CardData = Awaited<ReturnType<typeof getCardsData>>["cards"] extends Map<string, infer V> ? V : never;

/** Card data for every player of the club in a scope (attributes are squad-relative). */
export async function getCardsData(clubId: string, seasonId: string | null) {
  const [stats, players] = await Promise.all([
    getSeasonStats({ clubId, seasonId }),
    db.select().from(schema.players).where(eq(schema.players.clubId, clubId)),
  ]);
  const attrs = squadAttributes(stats.summaries);
  const cards = new Map(players.map((p) => {
    const s = stats.summaryMap.get(p.id)!;
    const ovr = cardOverall(p.overall, s.avgRating);
    return [p.id, { player: p, summary: s, attributes: attrs.get(p.id) as Attributes, ovr }] as const;
  }));
  return { cards, stats };
}

export async function currentSeasonInfo(clubId: string) {
  const o = await getClubOverview(clubId);
  return { seasonId: o.currentSeason?.id ?? null, seasonName: o.currentSeason?.name ?? null };
}

/** The logged-in member's own player (for personalization), or null for staff without a player. */
export async function getMe(ctx: AuthContext) {
  if (!ctx.playerId) return null;
  const [p] = await db.select().from(schema.players).where(and(eq(schema.players.id, ctx.playerId), eq(schema.players.clubId, ctx.club.id)));
  return p ?? null;
}
