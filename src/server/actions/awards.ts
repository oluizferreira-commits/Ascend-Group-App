"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAction } from "../auth/session";
import { audit } from "../audit";
import type { ActionResult } from "../errors";
import { editionCandidates, getEdition } from "../services/awards";
import { editionStatus } from "@/lib/awards";
import { parseLocalInput } from "@/lib/format";

/** Everyone in the club (squad + staff) votes once per edition, not for themselves; changeable while open. */
export async function voteAwardAction(editionId: string, playerId: string): Promise<ActionResult> {
  const ctx = await requireAction("dashboard.view");
  const e = await getEdition(ctx.club.id, editionId);
  if (!e) return { ok: false, error: "Votação não encontrada." };
  const status = editionStatus(e);
  if (status === "upcoming") return { ok: false, error: "A votação ainda não abriu." };
  if (status === "closed") return { ok: false, error: "A votação já encerrou." };
  if (ctx.playerId === playerId) return { ok: false, error: "Não vale votar em si mesmo 😉" };
  const cands = await editionCandidates(e);
  if (!cands.some((c) => c.player.id === playerId)) return { ok: false, error: "Jogador inválido." };
  await db.insert(schema.awardVotes).values({ editionId, voterUserId: ctx.user.id, playerId })
    .onConflictDoUpdate({ target: [schema.awardVotes.editionId, schema.awardVotes.voterUserId], set: { playerId, createdAt: new Date() } });
  revalidatePath(`/app/premios/${editionId}`);
  revalidatePath("/app/premios");
  return { ok: true, message: "Voto registrado!" };
}

/** Staff can move the voting window of an edition that hasn't been finalised. */
export async function updateEditionDatesAction(editionId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const ctx = await requireAction("seasons.manage");
  const e = await getEdition(ctx.club.id, editionId);
  if (!e || e.finalizedAt) return { ok: false, error: "Edição já encerrada não pode ser alterada." };
  const opens = parseLocalInput(String(form.get("opens") ?? "")), closes = parseLocalInput(String(form.get("closes") ?? ""));
  if (!opens || !closes || closes <= opens) return { ok: false, error: "Datas inválidas (o fechamento deve ser depois da abertura)." };
  await db.update(schema.awardEditions).set({ votingOpensAt: opens, votingClosesAt: closes })
    .where(and(eq(schema.awardEditions.id, editionId), eq(schema.awardEditions.clubId, ctx.club.id)));
  await audit(ctx, "award.dates", "award_edition", editionId, { opens, closes });
  revalidatePath(`/app/premios/${editionId}`);
  revalidatePath("/app/premios");
  return { ok: true, message: "Datas atualizadas." };
}
