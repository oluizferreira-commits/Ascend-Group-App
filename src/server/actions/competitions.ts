"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireAction } from "../auth/session";
import { audit } from "../audit";
import { pgErrorCode, type ActionResult } from "../errors";
import { optionalInt, optionalText, optionalUuid } from "@/lib/validation/common";
import { parseLocalInput } from "@/lib/format";
import { syncFixturesFromMatch } from "../services/fixtures";

const compSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome").max(80),
  seasonId: optionalUuid,
  format: z.enum(["league", "knockout", "groups_knockout", "friendly", "ea_division"]),
  pointsWin: z.coerce.number().int().min(0).max(10),
  pointsDraw: z.coerce.number().int().min(0).max(10),
  notes: optionalText(2000),
});

async function ownComp(clubId: string, id: string) {
  const [c] = await db.select().from(schema.competitions).where(and(eq(schema.competitions.id, id), eq(schema.competitions.clubId, clubId)));
  return c ?? null;
}

export async function createCompetitionAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const ctx = await requireAction("competitions.manage");
  const parsed = compSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: "Verifique os campos.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  if (parsed.data.seasonId) {
    const [s] = await db.select().from(schema.seasons).where(and(eq(schema.seasons.id, parsed.data.seasonId), eq(schema.seasons.clubId, ctx.club.id)));
    if (!s) return { ok: false, error: "Temporada inválida." };
  }
  const id = await db.transaction(async (tx) => {
    const [c] = await tx.insert(schema.competitions).values({ ...parsed.data, clubId: ctx.club.id }).returning();
    await tx.insert(schema.competitionTeams).values({ competitionId: c.id, name: ctx.club.name, isOwnClub: true });
    await audit(ctx, "competition.create", "competition", c.id, { name: c.name }, tx);
    return c.id;
  });
  revalidatePath("/app/competicoes");
  redirect(`/app/competicoes/${id}`);
}

export async function addTeamAction(compId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const ctx = await requireAction("competitions.manage");
  if (!(await ownComp(ctx.club.id, compId))) return { ok: false, error: "Competição não encontrada." };
  const parsed = z.object({ name: z.string().trim().min(1).max(80), groupName: optionalText(20) }).safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: "Informe o nome do time." };
  try {
    await db.insert(schema.competitionTeams).values({ competitionId: compId, ...parsed.data });
  } catch (e) {
    if (pgErrorCode(e) === "23505") return { ok: false, error: "Esse time já participa." };
    throw e;
  }
  revalidatePath(`/app/competicoes/${compId}`);
  return { ok: true, message: "Time adicionado." };
}

export async function removeTeamAction(compId: string, teamId: string) {
  const ctx = await requireAction("competitions.manage");
  if (!(await ownComp(ctx.club.id, compId))) return;
  await db.delete(schema.competitionTeams).where(and(eq(schema.competitionTeams.id, teamId), eq(schema.competitionTeams.competitionId, compId), eq(schema.competitionTeams.isOwnClub, false)));
  revalidatePath(`/app/competicoes/${compId}`);
}

const fixtureSchema = z.object({
  round: optionalText(40),
  homeTeamId: z.uuid("Escolha o mandante"),
  awayTeamId: z.uuid("Escolha o visitante"),
  scheduledAt: z.string().optional(),
  homeGoals: optionalInt(0, 99),
  awayGoals: optionalInt(0, 99),
  matchId: optionalUuid,
}).refine((d) => d.homeTeamId !== d.awayTeamId, { message: "Mandante e visitante iguais", path: ["awayTeamId"] })
  .refine((d) => (d.homeGoals == null) === (d.awayGoals == null), { message: "Informe os dois placares (ou nenhum)", path: ["awayGoals"] });

export async function saveFixtureAction(compId: string, fixtureId: string | null, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const ctx = await requireAction("competitions.manage");
  if (!(await ownComp(ctx.club.id, compId))) return { ok: false, error: "Competição não encontrada." };
  const parsed = fixtureSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Verifique os campos." };
  const d = parsed.data;
  const teams = await db.select().from(schema.competitionTeams).where(eq(schema.competitionTeams.competitionId, compId));
  const home = teams.find((t) => t.id === d.homeTeamId), away = teams.find((t) => t.id === d.awayTeamId);
  if (!home || !away) return { ok: false, error: "Times inválidos." };
  if (d.matchId) {
    if (!home.isOwnClub && !away.isOwnClub) return { ok: false, error: "Só jogos do Ascend podem ser vinculados a uma partida." };
    const [m] = await db.select().from(schema.matches).where(and(eq(schema.matches.id, d.matchId), eq(schema.matches.clubId, ctx.club.id)));
    if (!m) return { ok: false, error: "Partida inválida." };
  }
  const row = {
    round: d.round, homeTeamId: d.homeTeamId, awayTeamId: d.awayTeamId,
    scheduledAt: d.scheduledAt ? parseLocalInput(d.scheduledAt) : null, homeGoals: d.homeGoals, awayGoals: d.awayGoals, matchId: d.matchId,
  };
  if (fixtureId) await db.update(schema.competitionFixtures).set(row).where(and(eq(schema.competitionFixtures.id, fixtureId), eq(schema.competitionFixtures.competitionId, compId)));
  else await db.insert(schema.competitionFixtures).values({ ...row, competitionId: compId });
  if (d.matchId) await syncFixturesFromMatch(ctx.club.id, d.matchId);
  await audit(ctx, fixtureId ? "fixture.update" : "fixture.create", "competition", compId, { home: home.name, away: away.name, score: [d.homeGoals, d.awayGoals] });
  revalidatePath(`/app/competicoes/${compId}`);
  return { ok: true, message: "Jogo salvo. Classificação atualizada." };
}

export async function deleteFixtureAction(compId: string, fixtureId: string) {
  const ctx = await requireAction("competitions.manage");
  if (!(await ownComp(ctx.club.id, compId))) return;
  await db.delete(schema.competitionFixtures).where(and(eq(schema.competitionFixtures.id, fixtureId), eq(schema.competitionFixtures.competitionId, compId)));
  revalidatePath(`/app/competicoes/${compId}`);
}

export async function deleteCompetitionAction(compId: string) {
  const ctx = await requireAction("competitions.manage");
  const [c] = await db.delete(schema.competitions).where(and(eq(schema.competitions.id, compId), eq(schema.competitions.clubId, ctx.club.id))).returning();
  if (c) await audit(ctx, "competition.delete", "competition", compId, { name: c.name });
  revalidatePath("/app/competicoes");
  redirect("/app/competicoes");
}
