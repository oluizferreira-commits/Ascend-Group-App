import "server-only";
import { and, asc, eq, gte, lte, inArray, isNull, or } from "drizzle-orm";
import { db, schema } from "@/db";

export const EVENT_TYPE_LABELS = { match: "Partida", training: "Treino", meeting: "Reunião", other: "Outro" } as const;
export const ATTENDANCE_LABELS = { pending: "Aguardando", confirmed: "Confirmado", declined: "Recusou", present: "Presente", absent: "Ausente" } as const;

export async function listAgenda(clubId: string, from: Date, to: Date) {
  const [events, matches] = await Promise.all([
    db.select().from(schema.calendarEvents).where(and(eq(schema.calendarEvents.clubId, clubId), gte(schema.calendarEvents.startsAt, from), lte(schema.calendarEvents.startsAt, to))).orderBy(asc(schema.calendarEvents.startsAt)),
    db.select().from(schema.matches).where(and(eq(schema.matches.clubId, clubId), gte(schema.matches.kickoffAt, from), lte(schema.matches.kickoffAt, to))).orderBy(asc(schema.matches.kickoffAt)),
  ]);
  const linked = new Set(events.map((e) => e.matchId).filter(Boolean));
  const items = [
    ...events.map((e) => ({ kind: "event" as const, id: e.id, type: e.type, title: e.title, at: e.startsAt, href: `/app/calendario/${e.id}` })),
    ...matches.filter((m) => !linked.has(m.id)).map((m) => ({
      kind: "match" as const, id: m.id, type: "match" as const, title: `vs ${m.opponentName}${m.status === "finished" ? ` (${m.goalsFor}–${m.goalsAgainst})` : ""}`, at: m.kickoffAt, href: `/app/partidas/${m.id}`,
    })),
  ];
  return items.sort((a, b) => a.at.getTime() - b.at.getTime());
}

export async function getEvent(clubId: string, id: string) {
  const [e] = await db.select().from(schema.calendarEvents).where(and(eq(schema.calendarEvents.id, id), eq(schema.calendarEvents.clubId, clubId)));
  if (!e) return null;
  const att = await db.select({ a: schema.attendance, p: schema.players }).from(schema.attendance)
    .innerJoin(schema.players, eq(schema.players.id, schema.attendance.playerId))
    .where(eq(schema.attendance.eventId, id)).orderBy(asc(schema.players.nickname));
  return { ...e, attendance: att };
}

/** Availability record covering a given day for each player (latest wins). */
export async function availabilityOn(playerIds: string[], day: string) {
  if (!playerIds.length) return new Map<string, typeof schema.playerAvailability.$inferSelect>();
  const rows = await db.select().from(schema.playerAvailability).where(and(
    inArray(schema.playerAvailability.playerId, playerIds), lte(schema.playerAvailability.startsOn, day),
    or(isNull(schema.playerAvailability.endsOn), gte(schema.playerAvailability.endsOn, day)),
  )).orderBy(asc(schema.playerAvailability.createdAt));
  return new Map(rows.map((r) => [r.playerId, r]));
}

export async function pendingCallupsFor(playerId: string) {
  return db.select({ a: schema.attendance, e: schema.calendarEvents }).from(schema.attendance)
    .innerJoin(schema.calendarEvents, eq(schema.calendarEvents.id, schema.attendance.eventId))
    .where(and(eq(schema.attendance.playerId, playerId), eq(schema.attendance.status, "pending"), gte(schema.calendarEvents.startsAt, new Date(Date.now() - 3 * 3600_000))))
    .orderBy(asc(schema.calendarEvents.startsAt));
}
