"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireAction } from "../auth/session";
import type { ActionResult } from "../errors";
import { mvpCandidates } from "../services/mvp";
import { mvpWindow } from "@/lib/mvp";
import { visibleScopes } from "../services/announcements";

/** Everyone in the club (players and staff) votes once per match; not for themselves. Vote can be changed while open. */
export async function voteMvpAction(matchId: string, playerId: string): Promise<ActionResult> {
  const ctx = await requireAction("dashboard.view");
  const [m] = await db.select().from(schema.matches).where(and(eq(schema.matches.id, matchId), eq(schema.matches.clubId, ctx.club.id)));
  if (!m || m.status !== "finished") return { ok: false, error: "Votação indisponível." };
  if (Date.now() >= mvpWindow(m.kickoffAt, m.createdAt).closesAt.getTime()) return { ok: false, error: "A votação desta partida já encerrou." };
  if (ctx.playerId === playerId) return { ok: false, error: "Não vale votar em si mesmo 😉" };
  const candidates = await mvpCandidates(matchId);
  if (!candidates.some((c) => c.id === playerId)) return { ok: false, error: "Jogador não disputou esta partida." };
  await db.insert(schema.matchMvpVotes).values({ matchId, voterUserId: ctx.user.id, playerId })
    .onConflictDoUpdate({ target: [schema.matchMvpVotes.matchId, schema.matchMvpVotes.voterUserId], set: { playerId, createdAt: new Date() } });
  revalidatePath(`/app/partidas/${matchId}`);
  revalidatePath("/app");
  return { ok: true, message: "Voto registrado!" };
}

export async function votePollAction(announcementId: string, optionIndex: number): Promise<ActionResult> {
  const ctx = await requireAction("announcements.view");
  const [a] = await db.select({ a: schema.announcements, poll: schema.announcementPolls }).from(schema.announcements)
    .innerJoin(schema.announcementPolls, eq(schema.announcementPolls.announcementId, schema.announcements.id))
    .where(and(eq(schema.announcements.id, announcementId), eq(schema.announcements.clubId, ctx.club.id)));
  if (!a || !visibleScopes(ctx).includes(a.a.visibility)) return { ok: false, error: "Enquete não encontrada." };
  if (a.a.expiresAt && a.a.expiresAt <= new Date()) return { ok: false, error: "Enquete encerrada." };
  if (!Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= a.poll.options.length) return { ok: false, error: "Opção inválida." };
  await db.insert(schema.pollVotes).values({ announcementId, userId: ctx.user.id, optionIndex })
    .onConflictDoUpdate({ target: [schema.pollVotes.announcementId, schema.pollVotes.userId], set: { optionIndex, createdAt: new Date() } });
  revalidatePath("/app/avisos");
  revalidatePath("/app");
  return { ok: true };
}
