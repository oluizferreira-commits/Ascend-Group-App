"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireAction } from "../auth/session";
import { audit } from "../audit";
import { notify } from "../notify";
import type { ActionResult } from "../errors";
import { optionalDate, optionalText } from "@/lib/validation/common";
import { fmtWeekdayTime, parseLocalInput } from "@/lib/format";

const eventSchema = z.object({
  type: z.enum(["training", "meeting", "other", "match"]),
  title: z.string().trim().min(2, "Informe o título").max(100),
  startsAt: z.string(),
  endsAt: z.string().optional(),
  description: optionalText(2000),
});

export async function saveEventAction(eventId: string | null, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const ctx = await requireAction("calendar.manage");
  const parsed = eventSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: "Verifique os campos.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const startsAt = parseLocalInput(parsed.data.startsAt);
  const endsAt = parsed.data.endsAt ? parseLocalInput(parsed.data.endsAt) : null;
  if (!startsAt) return { ok: false, error: "Data de início inválida.", fieldErrors: { startsAt: ["Inválida"] } };
  if (endsAt && endsAt <= startsAt) return { ok: false, error: "O término deve ser após o início.", fieldErrors: { endsAt: ["Após o início"] } };
  const row = { type: parsed.data.type, title: parsed.data.title, description: parsed.data.description, startsAt, endsAt };
  if (eventId) {
    const [before] = await db.select().from(schema.calendarEvents).where(and(eq(schema.calendarEvents.id, eventId), eq(schema.calendarEvents.clubId, ctx.club.id)));
    if (!before) return { ok: false, error: "Evento não encontrado." };
    await db.update(schema.calendarEvents).set(row).where(eq(schema.calendarEvents.id, eventId));
    await audit(ctx, "event.update", "calendar_event", eventId, { title: row.title });
    if (before.startsAt.getTime() !== startsAt.getTime()) {
      const called = await db.select({ p: schema.attendance.playerId }).from(schema.attendance).where(eq(schema.attendance.eventId, eventId));
      await notify(ctx.club.id, { kind: "players", playerIds: called.map((c) => c.p) }, {
        type: "event.time_changed", title: `Horário alterado: ${row.title}`, body: `Novo horário: ${fmtWeekdayTime(startsAt)}`, link: `/app/calendario/${eventId}`,
      });
    }
    revalidatePath(`/app/calendario/${eventId}`);
    return { ok: true, message: "Evento atualizado." };
  }
  const [e] = await db.insert(schema.calendarEvents).values({ ...row, clubId: ctx.club.id, createdBy: ctx.user.id }).returning();
  await audit(ctx, "event.create", "calendar_event", e.id, { title: e.title, type: e.type });
  revalidatePath("/app/calendario");
  redirect(`/app/calendario/${e.id}`);
}

export async function deleteEventAction(id: string) {
  const ctx = await requireAction("calendar.manage");
  const [e] = await db.delete(schema.calendarEvents).where(and(eq(schema.calendarEvents.id, id), eq(schema.calendarEvents.clubId, ctx.club.id))).returning();
  if (e) await audit(ctx, "event.delete", "calendar_event", id, { title: e.title });
  revalidatePath("/app/calendario");
  redirect("/app/calendario");
}

/** Opens (or creates) the call-up event for a match. */
export async function callupForMatchAction(matchId: string) {
  const ctx = await requireAction("callups.manage");
  const [m] = await db.select().from(schema.matches).where(and(eq(schema.matches.id, matchId), eq(schema.matches.clubId, ctx.club.id)));
  if (!m) redirect("/app/partidas");
  let [e] = await db.select().from(schema.calendarEvents).where(and(eq(schema.calendarEvents.matchId, matchId), eq(schema.calendarEvents.clubId, ctx.club.id)));
  if (!e) {
    [e] = await db.insert(schema.calendarEvents).values({ clubId: ctx.club.id, type: "match", title: `Partida vs ${m.opponentName}`, startsAt: m.kickoffAt, matchId, createdBy: ctx.user.id }).returning();
    await audit(ctx, "event.create", "calendar_event", e.id, { matchId });
  }
  redirect(`/app/calendario/${e.id}`);
}

export async function callupPlayersAction(eventId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const ctx = await requireAction("callups.manage");
  const ids = z.array(z.uuid()).max(60).safeParse(form.getAll("playerIds"));
  if (!ids.success || ids.data.length === 0) return { ok: false, error: "Selecione ao menos um jogador." };
  const [e] = await db.select().from(schema.calendarEvents).where(and(eq(schema.calendarEvents.id, eventId), eq(schema.calendarEvents.clubId, ctx.club.id)));
  if (!e) return { ok: false, error: "Evento não encontrado." };
  const valid = await db.select({ id: schema.players.id }).from(schema.players).where(and(eq(schema.players.clubId, ctx.club.id), inArray(schema.players.id, ids.data)));
  const inserted = await db.insert(schema.attendance).values(valid.map((p) => ({ eventId, playerId: p.id }))).onConflictDoNothing().returning({ p: schema.attendance.playerId });
  await audit(ctx, "callup.create", "calendar_event", eventId, { players: inserted.length });
  await notify(ctx.club.id, { kind: "players", playerIds: inserted.map((i) => i.p) }, {
    type: "callup", title: `Você foi convocado: ${e.title}`, body: `${fmtWeekdayTime(e.startsAt)} — confirme sua presença.`, link: `/app/calendario/${eventId}`,
  });
  revalidatePath(`/app/calendario/${eventId}`);
  return { ok: true, message: `${inserted.length} jogador(es) convocado(s).` };
}

export async function setAttendanceAction(eventId: string, playerId: string, status: "present" | "absent" | "pending") {
  const ctx = await requireAction("callups.manage");
  const [e] = await db.select().from(schema.calendarEvents).where(and(eq(schema.calendarEvents.id, eventId), eq(schema.calendarEvents.clubId, ctx.club.id)));
  if (!e) return;
  await db.update(schema.attendance).set({ status }).where(and(eq(schema.attendance.eventId, eventId), eq(schema.attendance.playerId, playerId)));
  revalidatePath(`/app/calendario/${eventId}`);
}

export async function removeCallupAction(eventId: string, playerId: string) {
  const ctx = await requireAction("callups.manage");
  const [e] = await db.select().from(schema.calendarEvents).where(and(eq(schema.calendarEvents.id, eventId), eq(schema.calendarEvents.clubId, ctx.club.id)));
  if (!e) return;
  await db.delete(schema.attendance).where(and(eq(schema.attendance.eventId, eventId), eq(schema.attendance.playerId, playerId)));
  revalidatePath(`/app/calendario/${eventId}`);
}

/** The player answers their own call-up. */
export async function respondCallupAction(eventId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const ctx = await requireAction("availability.self");
  if (!ctx.playerId) return { ok: false, error: "Sua conta não está vinculada a um jogador do elenco." };
  const status = form.get("status");
  if (status !== "confirmed" && status !== "declined") return { ok: false, error: "Resposta inválida." };
  const note = String(form.get("note") ?? "").trim().slice(0, 300) || null;
  const [u] = await db.update(schema.attendance).set({ status, note, respondedAt: new Date() })
    .where(and(eq(schema.attendance.eventId, eventId), eq(schema.attendance.playerId, ctx.playerId))).returning();
  if (!u) return { ok: false, error: "Você não está convocado para este evento." };
  if (status === "declined") {
    await notify(ctx.club.id, { kind: "staff" }, { type: "callup.declined", title: `${ctx.user.displayName} recusou a convocação`, body: note ?? undefined, link: `/app/calendario/${eventId}` });
  }
  revalidatePath(`/app/calendario/${eventId}`);
  revalidatePath("/app");
  return { ok: true, message: status === "confirmed" ? "Presença confirmada." : "Ausência registrada." };
}

const availSchema = z.object({
  status: z.enum(["available", "unavailable", "doubtful"]),
  startsOn: z.iso.date("Data inválida"),
  endsOn: optionalDate,
  reason: optionalText(300),
}).refine((d) => !d.endsOn || d.endsOn >= d.startsOn, { path: ["endsOn"], message: "Fim antes do início" });

export async function addAvailabilityAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const ctx = await requireAction("availability.self");
  if (!ctx.playerId) return { ok: false, error: "Sua conta não está vinculada a um jogador do elenco. Peça à diretoria." };
  const parsed = availSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: "Verifique os campos.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  await db.insert(schema.playerAvailability).values({ ...parsed.data, playerId: ctx.playerId });
  if (parsed.data.status !== "available") {
    await notify(ctx.club.id, { kind: "staff" }, { type: "availability", title: `${ctx.user.displayName}: ${parsed.data.status === "unavailable" ? "indisponível" : "dúvida"}`, body: `${parsed.data.startsOn}${parsed.data.endsOn ? ` a ${parsed.data.endsOn}` : ""}${parsed.data.reason ? ` — ${parsed.data.reason}` : ""}`, link: "/app/disponibilidade" });
  }
  revalidatePath("/app/disponibilidade");
  return { ok: true, message: "Disponibilidade registrada." };
}

export async function deleteAvailabilityAction(id: string) {
  const ctx = await requireAction("availability.self");
  if (!ctx.playerId) return;
  await db.delete(schema.playerAvailability).where(and(eq(schema.playerAvailability.id, id), eq(schema.playerAvailability.playerId, ctx.playerId)));
  revalidatePath("/app/disponibilidade");
}
