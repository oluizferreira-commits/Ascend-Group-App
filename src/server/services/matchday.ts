import "server-only";
import { and, asc, desc, eq, gte, lte } from "drizzle-orm";
import { db, schema } from "@/db";
import type { AuthContext } from "../auth/session";

/** End of the current day in São Paulo (UTC−3, no DST). */
function endOfTodaySP(now = new Date()) {
  const sp = new Date(now.getTime() - 3 * 3600_000);
  const end = Date.UTC(sp.getUTCFullYear(), sp.getUTCMonth(), sp.getUTCDate(), 23, 59, 59);
  return new Date(end + 3 * 3600_000);
}

/** The match of the day: kickoff between 2h30 ago and the later of "end of today" / "12 h from now". */
export async function getMatchday(ctx: AuthContext) {
  const now = new Date();
  const until = new Date(Math.max(endOfTodaySP(now).getTime(), now.getTime() + 12 * 3600_000));
  const [row] = await db.select({ m: schema.matches, competition: schema.competitions.name }).from(schema.matches)
    .leftJoin(schema.competitions, eq(schema.competitions.id, schema.matches.competitionId))
    .where(and(eq(schema.matches.clubId, ctx.club.id), eq(schema.matches.status, "scheduled"),
      gte(schema.matches.kickoffAt, new Date(now.getTime() - 150 * 60_000)), lte(schema.matches.kickoffAt, until)))
    .orderBy(asc(schema.matches.kickoffAt)).limit(1);
  if (!row) return null;
  const m = row.m;
  const [[lineup], [event]] = await Promise.all([
    db.select({ l: schema.lineups, formation: schema.formations.name }).from(schema.lineups)
      .innerJoin(schema.formations, eq(schema.formations.id, schema.lineups.formationId))
      .where(and(eq(schema.lineups.clubId, ctx.club.id), eq(schema.lineups.matchId, m.id))).orderBy(desc(schema.lineups.updatedAt)).limit(1),
    db.select().from(schema.calendarEvents).where(and(eq(schema.calendarEvents.clubId, ctx.club.id), eq(schema.calendarEvents.matchId, m.id))).limit(1),
  ]);
  const att = event ? await db.select({ playerId: schema.attendance.playerId, status: schema.attendance.status }).from(schema.attendance).where(eq(schema.attendance.eventId, event.id)) : [];
  const count = (s: string) => att.filter((a) => a.status === s).length;
  return {
    serverNow: now.getTime(),
    match: m,
    competition: row.competition,
    lineup: lineup ? { id: lineup.l.id, name: lineup.l.name, formation: lineup.formation } : null,
    eventId: event?.id ?? null,
    called: att.length,
    confirmed: count("confirmed") + count("present"),
    pending: count("pending"),
    declined: count("declined"),
    myStatus: ctx.playerId ? att.find((a) => a.playerId === ctx.playerId)?.status ?? null : null,
  };
}
