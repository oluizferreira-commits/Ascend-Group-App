import "server-only";
import { and, asc, eq, gte } from "drizzle-orm";
import { db, schema } from "@/db";
import { listFormations } from "./reference";
import { fmtDateTime } from "@/lib/format";

export async function lineupEditorData(clubId: string) {
  const [formations, players, matches] = await Promise.all([
    listFormations(clubId),
    db.select().from(schema.players).where(eq(schema.players.clubId, clubId)).orderBy(asc(schema.players.nickname)),
    db.select().from(schema.matches)
      .where(and(eq(schema.matches.clubId, clubId), gte(schema.matches.kickoffAt, new Date(Date.now() - 7 * 86400_000))))
      .orderBy(asc(schema.matches.kickoffAt)).limit(30),
  ]);
  return {
    formations: formations.map((f) => ({ id: f.id, name: f.name, slots: f.slots })),
    players: players.filter((p) => p.status !== "inactive").map((p) => ({
      id: p.id, nickname: p.nickname, shirtNumber: p.shirtNumber, primaryPosition: p.primaryPosition,
      secondaryPositions: p.secondaryPositions, status: p.status, overall: p.overall,
    })),
    matches: matches.map((m) => ({ id: m.id, label: `${fmtDateTime(m.kickoffAt)} · vs ${m.opponentName}` })),
  };
}
