import "server-only";
import { and, eq, gt, gte, lte } from "drizzle-orm";
import { db, schema } from "@/db";
import { notify } from "./notify";
import { mvpCandidates } from "./services/mvp";
import { mvpWindow } from "@/lib/mvp";
import { fmtWeekdayTime } from "@/lib/format";

/** Claims a reminder key; true only for the first caller (safe across concurrent instances). */
async function claim(key: string) {
  const r = await db.insert(schema.remindersSent).values({ key }).onConflictDoNothing().returning({ key: schema.remindersSent.key });
  return r.length > 0;
}

const lastRun = new Map<string, number>();

/**
 * Automatic reminders. Runs opportunistically (app visits via `after()`) and from the hourly
 * scheduled sync. Throttled per club to once every 2 minutes per instance. Never throws.
 */
export async function runReminders(clubId: string) {
  if (Date.now() - (lastRun.get(clubId) ?? 0) < Number(process.env.REMINDER_THROTTLE_MS ?? 120_000)) return;
  lastRun.set(clubId, Date.now());
  try {
    const now = Date.now();

    // 1) "Jogo em 1 hora" — kickoff between 20 and 90 minutes from now.
    const soon = await db.select().from(schema.matches).where(and(
      eq(schema.matches.clubId, clubId), eq(schema.matches.status, "scheduled"),
      gte(schema.matches.kickoffAt, new Date(now + 20 * 60_000)), lte(schema.matches.kickoffAt, new Date(now + 90 * 60_000)),
    ));
    for (const m of soon) {
      if (!(await claim(`match1h:${m.id}`))) continue;
      const [ev] = await db.select().from(schema.calendarEvents).where(and(eq(schema.calendarEvents.matchId, m.id), eq(schema.calendarEvents.clubId, clubId)));
      const called = ev ? await db.select({ p: schema.attendance.playerId }).from(schema.attendance).where(eq(schema.attendance.eventId, ev.id)) : [];
      await notify(clubId, called.length ? { kind: "players", playerIds: called.map((c) => c.p) } : { kind: "members" }, {
        type: "match.soon", title: `⏱️ Jogo em 1 hora: vs ${m.opponentName}`, body: `Começa ${fmtWeekdayTime(m.kickoffAt)}. Bora, Ascend!`, link: "/app",
      });
    }

    // 2) Pending call-ups for events in the next 24 h.
    const upcoming = await db.select().from(schema.calendarEvents).where(and(
      eq(schema.calendarEvents.clubId, clubId), gt(schema.calendarEvents.startsAt, new Date(now)), lte(schema.calendarEvents.startsAt, new Date(now + 24 * 3600_000)),
    ));
    for (const e of upcoming) {
      const pending = await db.select({ p: schema.attendance.playerId }).from(schema.attendance)
        .where(and(eq(schema.attendance.eventId, e.id), eq(schema.attendance.status, "pending")));
      if (!pending.length || !(await claim(`callup24h:${e.id}`))) continue;
      await notify(clubId, { kind: "players", playerIds: pending.map((x) => x.p) }, {
        type: "callup.reminder", title: `Confirme sua presença: ${e.title}`, body: `${fmtWeekdayTime(e.startsAt)} — falta você responder.`, link: `/app/calendario/${e.id}`,
      });
    }

    // 3) MVP vote is open for recently finished matches.
    const recent = await db.select().from(schema.matches).where(and(
      eq(schema.matches.clubId, clubId), eq(schema.matches.status, "finished"), gt(schema.matches.updatedAt, new Date(now - 48 * 3600_000)),
    ));
    for (const m of recent) {
      if (now >= mvpWindow(m.kickoffAt, m.createdAt).closesAt.getTime()) continue;
      if (!(await mvpCandidates(m.id)).length) continue;
      if (!(await claim(`mvp:${m.id}`))) continue;
      await notify(clubId, { kind: "members" }, {
        type: "mvp.open", title: `🏆 Vote no craque: Ascend CF ${m.goalsFor}×${m.goalsAgainst} ${m.opponentName}`,
        body: "A votação fica aberta por 48 horas.", link: `/app/partidas/${m.id}#craque`,
      });
    }
  } catch (e) {
    console.error("[reminders] failed", e);
  }
}
