"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, inArray, isNull, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAction } from "../auth/session";
import { audit } from "../audit";
import type { ActionResult } from "../errors";
import { lineupSchema } from "@/lib/validation/lineup";

export async function saveLineupAction(lineupId: string | null, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const ctx = await requireAction("lineups.manage");
  let raw: unknown;
  try { raw = JSON.parse(String(form.get("payload") ?? "{}")); } catch { return { ok: false, error: "Dados inválidos." }; }
  const parsed = lineupSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Verifique a escalação." };
  const d = parsed.data;

  const [formation] = await db.select().from(schema.formations)
    .where(and(eq(schema.formations.id, d.formationId), or(isNull(schema.formations.clubId), eq(schema.formations.clubId, ctx.club.id))));
  if (!formation) return { ok: false, error: "Formação inválida." };
  const validSlots = new Set(formation.slots.map((s) => s.key));
  if (Object.keys(d.slots).some((k) => !validSlots.has(k))) return { ok: false, error: "Posição de campo inválida para a formação." };
  if (d.matchId) {
    const [m] = await db.select({ id: schema.matches.id }).from(schema.matches).where(and(eq(schema.matches.id, d.matchId), eq(schema.matches.clubId, ctx.club.id)));
    if (!m) return { ok: false, error: "Partida inválida." };
  }
  const ids = [...Object.values(d.slots), ...d.bench];
  if (ids.length) {
    const found = await db.select({ id: schema.players.id }).from(schema.players).where(and(eq(schema.players.clubId, ctx.club.id), inArray(schema.players.id, ids)));
    if (found.length !== new Set(ids).size) return { ok: false, error: "Jogador inválido na escalação." };
  }

  const row = {
    name: d.name, formationId: d.formationId, opponentName: d.opponentName, matchId: d.matchId, notes: d.notes,
    captainId: d.captainId, freeKickTakerId: d.freeKickTakerId, penaltyTakerId: d.penaltyTakerId, cornerTakerId: d.cornerTakerId,
  };
  const id = await db.transaction(async (tx) => {
    let id = lineupId;
    if (id) {
      const [u] = await tx.update(schema.lineups).set(row).where(and(eq(schema.lineups.id, id), eq(schema.lineups.clubId, ctx.club.id))).returning();
      if (!u) return null;
      await tx.delete(schema.lineupPlayers).where(eq(schema.lineupPlayers.lineupId, id));
    } else {
      const [c] = await tx.insert(schema.lineups).values({ ...row, clubId: ctx.club.id, createdBy: ctx.user.id }).returning();
      id = c.id;
    }
    const lp = [
      ...Object.entries(d.slots).map(([slotKey, playerId]) => ({ lineupId: id!, playerId, slotKey, benchOrder: null })),
      ...d.bench.map((playerId, i) => ({ lineupId: id!, playerId, slotKey: null, benchOrder: i + 1 })),
    ];
    if (lp.length) await tx.insert(schema.lineupPlayers).values(lp);
    await audit(ctx, lineupId ? "lineup.update" : "lineup.create", "lineup", id, { name: d.name, starters: Object.keys(d.slots).length }, tx);
    return id;
  });
  if (!id) return { ok: false, error: "Escalação não encontrada." };
  revalidatePath("/app/escalacoes");
  if (!lineupId) redirect(`/app/escalacoes/${id}`);
  return { ok: true, message: "Escalação salva." };
}

export async function deleteLineupAction(id: string) {
  const ctx = await requireAction("lineups.manage");
  const [l] = await db.delete(schema.lineups).where(and(eq(schema.lineups.id, id), eq(schema.lineups.clubId, ctx.club.id))).returning();
  if (l) await audit(ctx, "lineup.delete", "lineup", id, { name: l.name });
  revalidatePath("/app/escalacoes");
  redirect("/app/escalacoes");
}
