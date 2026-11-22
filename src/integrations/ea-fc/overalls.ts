/**
 * Keeps players.overall in sync with the EA members list (proOverall).
 * Linking is by the player's "Nome / ID no EA FC" (case-insensitive). Idempotent.
 */
import { and, eq, isNotNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "@/db/schema";
import { eaMembersResponseSchema } from "./types";

type AnyDb = PostgresJsDatabase<typeof schema>;
export type OverallChange = { playerId: string; nickname: string; from: number | null; to: number };

export async function syncOveralls(db: AnyDb, clubId: string, payload: unknown): Promise<OverallChange[]> {
  const parsed = eaMembersResponseSchema.safeParse(payload);
  if (!parsed.success) throw new Error("Formato de membros da EA não reconhecido.");
  const byName = new Map<string, number>();
  for (const m of parsed.data.members) {
    const ovr = m.proOverall;
    if (ovr != null && Number.isInteger(ovr) && ovr >= 1 && ovr <= 99) byName.set(m.name.trim().toLowerCase(), ovr);
  }
  const roster = await db.select({ id: schema.players.id, nickname: schema.players.nickname, eaName: schema.players.eaName, overall: schema.players.overall })
    .from(schema.players).where(and(eq(schema.players.clubId, clubId), isNotNull(schema.players.eaName)));
  const now = new Date();
  const changes: OverallChange[] = [];
  for (const p of roster) {
    const ovr = byName.get(p.eaName!.trim().toLowerCase());
    if (ovr == null) continue;
    if (p.overall === ovr) {
      await db.update(schema.players).set({ overallSource: "ea", overallSyncedAt: now }).where(eq(schema.players.id, p.id));
      continue;
    }
    await db.transaction(async (tx) => {
      await tx.update(schema.players).set({ overall: ovr, overallSource: "ea", overallSyncedAt: now }).where(eq(schema.players.id, p.id));
      await tx.insert(schema.playerOverallHistory).values({ playerId: p.id, overall: ovr, previous: p.overall, source: "ea" });
    });
    changes.push({ playerId: p.id, nickname: p.nickname, from: p.overall, to: ovr });
  }
  return changes;
}
