import "server-only";
import { and, asc, eq, isNull, or } from "drizzle-orm";
import { db, schema } from "@/db";

export async function listPlayers(clubId: string) {
  return db.select().from(schema.players).where(eq(schema.players.clubId, clubId)).orderBy(asc(schema.players.nickname));
}

export async function getPlayer(clubId: string, id: string) {
  const [p] = await db.select().from(schema.players).where(and(eq(schema.players.id, id), eq(schema.players.clubId, clubId)));
  return p ?? null;
}

/** Club accounts that can be linked to a player (not linked elsewhere, or linked to `playerId`). */
export async function linkableUsers(clubId: string, playerId?: string) {
  const rows = await db
    .selectDistinct({ id: schema.users.id, name: schema.users.displayName, email: schema.users.email })
    .from(schema.memberships)
    .innerJoin(schema.users, eq(schema.users.id, schema.memberships.userId))
    .leftJoin(schema.players, and(eq(schema.players.userId, schema.users.id), eq(schema.players.clubId, clubId)))
    .where(and(eq(schema.memberships.clubId, clubId), or(isNull(schema.players.id), playerId ? eq(schema.players.id, playerId) : undefined)));
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}
