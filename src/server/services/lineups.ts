import "server-only";
import { and, desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";

export async function listLineups(clubId: string) {
  return db
    .select({ lineup: schema.lineups, formation: schema.formations.name, opponent: schema.matches.opponentName, kickoffAt: schema.matches.kickoffAt })
    .from(schema.lineups)
    .innerJoin(schema.formations, eq(schema.formations.id, schema.lineups.formationId))
    .leftJoin(schema.matches, eq(schema.matches.id, schema.lineups.matchId))
    .where(eq(schema.lineups.clubId, clubId))
    .orderBy(desc(schema.lineups.updatedAt));
}

export async function getLineup(clubId: string, id: string) {
  const [l] = await db.select().from(schema.lineups).where(and(eq(schema.lineups.id, id), eq(schema.lineups.clubId, clubId)));
  if (!l) return null;
  const players = await db.select().from(schema.lineupPlayers).where(eq(schema.lineupPlayers.lineupId, id));
  return { ...l, players };
}
