"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireAction } from "../auth/session";
import { audit } from "../audit";
import { AppError, pgConstraint, pgErrorCode, type ActionResult } from "../errors";
import { playerFormToObject, playerSchema, type PlayerInput } from "@/lib/validation/player";

function friendly(e: unknown): ActionResult {
  if (pgErrorCode(e) === "23505") {
    const c = pgConstraint(e);
    if (c === "players_club_shirt_uq") return { ok: false, error: "Número de camisa já está em uso.", fieldErrors: { shirtNumber: ["Já em uso por outro jogador ativo"] } };
    if (c === "players_club_ea_name_uq") return { ok: false, error: "Esse nome do EA FC já está cadastrado.", fieldErrors: { eaName: ["Já cadastrado"] } };
    if (c === "players_club_user_uq") return { ok: false, error: "Essa conta já está vinculada a outro jogador.", fieldErrors: { userId: ["Já vinculada"] } };
  }
  if (e instanceof AppError) return { ok: false, error: e.message };
  throw e;
}

async function assertUserInClub(userId: string | null, clubId: string) {
  if (!userId) return;
  const [m] = await db.select({ id: schema.memberships.id }).from(schema.memberships)
    .where(and(eq(schema.memberships.userId, userId), eq(schema.memberships.clubId, clubId))).limit(1);
  if (!m) throw new AppError("A conta escolhida não pertence ao clube.", "validation");
}

const toRow = (d: PlayerInput) => ({ ...d, secondaryPositions: d.secondaryPositions.filter((p) => p !== d.primaryPosition) });

export async function createPlayerAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const ctx = await requireAction("players.manage");
  const parsed = playerSchema.safeParse(playerFormToObject(form));
  if (!parsed.success) return { ok: false, error: "Verifique os campos.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  let id: string;
  try {
    await assertUserInClub(parsed.data.userId, ctx.club.id);
    const [p] = await db.insert(schema.players).values({ ...toRow(parsed.data), clubId: ctx.club.id }).returning({ id: schema.players.id });
    id = p.id;
    await audit(ctx, "player.create", "player", id, { nickname: parsed.data.nickname });
  } catch (e) {
    return friendly(e);
  }
  revalidatePath("/app/elenco");
  redirect(`/app/elenco/${id}`);
}

export async function updatePlayerAction(playerId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const ctx = await requireAction("players.manage");
  const parsed = playerSchema.safeParse(playerFormToObject(form));
  if (!parsed.success) return { ok: false, error: "Verifique os campos.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  try {
    await assertUserInClub(parsed.data.userId, ctx.club.id);
    const [before] = await db.select().from(schema.players).where(and(eq(schema.players.id, playerId), eq(schema.players.clubId, ctx.club.id)));
    if (!before) return { ok: false, error: "Jogador não encontrado." };
    const overallChanged = before.overall !== parsed.data.overall;
    await db.update(schema.players).set({ ...toRow(parsed.data), ...(overallChanged ? { overallSource: "manual" } : {}) })
      .where(and(eq(schema.players.id, playerId), eq(schema.players.clubId, ctx.club.id)));
    if (overallChanged && parsed.data.overall != null) {
      await db.insert(schema.playerOverallHistory).values({ playerId, overall: parsed.data.overall, previous: before.overall, source: "manual" });
    }
    const changed = Object.keys(parsed.data).filter((k) => JSON.stringify((before as Record<string, unknown>)[k]) !== JSON.stringify((parsed.data as Record<string, unknown>)[k]));
    await audit(ctx, "player.update", "player", playerId, { changed });
  } catch (e) {
    return friendly(e);
  }
  revalidatePath("/app/elenco");
  redirect(`/app/elenco/${playerId}`);
}
