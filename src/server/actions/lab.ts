"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, ne } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireAction, type AuthContext } from "../auth/session";
import { forbiddenError, type ActionResult } from "../errors";
import { baselineFor, labMatches } from "../services/lab";
import { ATTR_KEYS, ATTR_MAX, ATTR_MIN, GAME_VERSION, PLAYSTYLE_BY_KEY, type AttrKey } from "@/lib/lab/game-data";
import { isTopic, topicVariant } from "@/lib/lab/trainer";
import { goalTarget } from "@/lib/lab/progress";
import type { LabGoal } from "@/db/schema/lab";

/** Only the player edits their own Lab. Staff access is read-only by design. */
async function ownPlayer(): Promise<{ ctx: AuthContext; playerId: string }> {
  const ctx = await requireAction("dashboard.view");
  if (!ctx.playerId) throw forbiddenError("Apenas jogadores vinculados a uma conta podem editar o próprio Lab.");
  return { ctx, playerId: ctx.playerId };
}

async function event(playerId: string, actor: string, kind: string, title: string, payload: Record<string, unknown> = {}) {
  await db.insert(schema.labEvents).values({ playerId, actorUserId: actor, kind, title, payload });
}

const revalidate = () => revalidatePath("/app/lab", "layout");

const optInt = (min: number, max: number) => z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(min).max(max).nullable());
const attrValue = z.number().int().min(ATTR_MIN).max(ATTR_MAX).nullable();
const buildSchema = z.object({
  name: z.string().trim().min(1, "Dê um nome para a build").max(60),
  archetype: z.string().trim().max(60).transform((v) => v || null),
  level: optInt(1, 200),
  position: z.string().trim().max(40).transform((v) => v || null),
  role: z.string().trim().max(60).transform((v) => v || null),
  heightCm: optInt(150, 210),
  weightKg: optInt(45, 120),
  pointsAvailable: optInt(0, 5000),
  specializations: z.string().trim().max(200).transform((v) => v || null),
  notes: z.string().trim().max(1000).transform((v) => v || null),
  brief: z.string().trim().max(600).transform((v) => v || null),
  focusTopic: z.string().trim().max(60).transform((v) => v || null),
  isPrimary: z.preprocess((v) => v === "on" || v === "true", z.boolean()),
  attributes: z.preprocess((v) => { try { return JSON.parse(String(v ?? "{}")); } catch { return null; } },
    z.record(z.string(), z.object({ initial: attrValue, planned: attrValue }))),
  playstyles: z.preprocess((v) => { try { return JSON.parse(String(v ?? "[]")); } catch { return null; } },
    z.array(z.object({ key: z.string(), plus: z.boolean() })).max(20)),
});

export async function saveBuildAction(buildId: string | null, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { ctx, playerId } = await ownPlayer();
  const parsed = buildSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: "Confira os campos destacados.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  const d = parsed.data;
  const attributes = Object.fromEntries(Object.entries(d.attributes).filter(([k, v]) => ATTR_KEYS.includes(k as AttrKey) && (v.initial != null || v.planned != null)));
  const playstyles = d.playstyles.filter((p) => p.key in PLAYSTYLE_BY_KEY);
  const values = { ...d, attributes, playstyles, gameVersion: GAME_VERSION, updatedAt: new Date() };
  let id = buildId;
  if (!id) {
    const existing = await db.select({ id: schema.labBuilds.id }).from(schema.labBuilds).where(eq(schema.labBuilds.playerId, playerId));
    if (existing.length >= 20) return { ok: false, error: "Limite de 20 builds salvas. Exclua uma antiga para criar outra." };
  }
  await db.transaction(async (tx) => {
    if (id) {
      const res = await tx.update(schema.labBuilds).set(values).where(and(eq(schema.labBuilds.id, id), eq(schema.labBuilds.playerId, playerId))).returning({ id: schema.labBuilds.id });
      if (!res.length) throw forbiddenError("Build não encontrada.");
    } else {
      const existing = await tx.select({ id: schema.labBuilds.id }).from(schema.labBuilds).where(eq(schema.labBuilds.playerId, playerId));
      const [row] = await tx.insert(schema.labBuilds).values({ ...values, playerId, isPrimary: d.isPrimary || existing.length === 0 }).returning({ id: schema.labBuilds.id });
      id = row.id;
    }
    if (d.isPrimary) await tx.update(schema.labBuilds).set({ isPrimary: false }).where(and(eq(schema.labBuilds.playerId, playerId), ne(schema.labBuilds.id, id!)));
  });
  await event(playerId, ctx.user.id, "build_saved", `Build “${d.name}” ${buildId ? "atualizada" : "criada"}`, { buildId: id, focusTopic: d.focusTopic });
  revalidate();
  redirect(`/app/lab/builds/${id}?salvo=1`);
}

export async function setPrimaryBuildAction(buildId: string) {
  const { ctx, playerId } = await ownPlayer();
  const [b] = await db.select({ name: schema.labBuilds.name }).from(schema.labBuilds).where(and(eq(schema.labBuilds.id, buildId), eq(schema.labBuilds.playerId, playerId)));
  if (!b) throw forbiddenError("Build não encontrada.");
  await db.transaction(async (tx) => {
    await tx.update(schema.labBuilds).set({ isPrimary: false }).where(eq(schema.labBuilds.playerId, playerId));
    await tx.update(schema.labBuilds).set({ isPrimary: true, updatedAt: new Date() }).where(eq(schema.labBuilds.id, buildId));
  });
  await event(playerId, ctx.user.id, "build_primary", `Build principal: “${b.name}”`, { buildId });
  revalidate();
}

const dayRe = /^\d{4}-\d{2}-\d{2}$/;
export async function startUsingBuildAction(buildId: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const { ctx, playerId } = await ownPlayer();
  const day = String(form.get("startedOn") ?? "");
  if (!dayRe.test(day) || Number.isNaN(Date.parse(day))) return { ok: false, error: "Informe uma data válida." };
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  if (day > today) return { ok: false, error: "A data não pode estar no futuro." };
  const res = await db.update(schema.labBuilds).set({ startedUsingOn: day, isPrimary: true, updatedAt: new Date() })
    .where(and(eq(schema.labBuilds.id, buildId), eq(schema.labBuilds.playerId, playerId))).returning({ name: schema.labBuilds.name });
  if (!res.length) return { ok: false, error: "Build não encontrada." };
  await db.update(schema.labBuilds).set({ isPrimary: false }).where(and(eq(schema.labBuilds.playerId, playerId), ne(schema.labBuilds.id, buildId)));
  await event(playerId, ctx.user.id, "build_started", `Começou a usar “${res[0].name}”`, { buildId, day });
  revalidate();
  return { ok: true, message: "Registrado. O Lab vai comparar suas partidas antes e depois desta data." };
}

export async function deleteBuildAction(buildId: string) {
  const { ctx, playerId } = await ownPlayer();
  const res = await db.delete(schema.labBuilds).where(and(eq(schema.labBuilds.id, buildId), eq(schema.labBuilds.playerId, playerId))).returning({ name: schema.labBuilds.name });
  if (res.length) await event(playerId, ctx.user.id, "build_deleted", `Build “${res[0].name}” excluída`, {});
  revalidate();
  redirect("/app/lab/builds");
}

export async function createPlanAction(topic: string, variant: string | null, origin: "trainer" | "insight") {
  const { ctx, playerId } = await ownPlayer();
  if (!isTopic(topic)) throw forbiddenError("Tema inválido.");
  const { topic: t, variantKey, variant: v } = topicVariant(topic, variant);
  const matches = await labMatches(ctx.club.id, playerId);
  const baseline = baselineFor(matches);
  const goals: LabGoal[] = v.goals.map((g, i) => {
    const target = g.metric && g.direction && g.delta != null ? goalTarget(g.metric, baseline[g.metric] ?? null, g.direction, g.delta) : null;
    return { id: `g${i + 1}`, text: g.text, metric: g.metric ?? null, target, direction: g.direction ?? null, done: false };
  });
  // One active plan per topic: archive the previous one.
  await db.update(schema.labPlans).set({ status: "archived", updatedAt: new Date() })
    .where(and(eq(schema.labPlans.playerId, playerId), eq(schema.labPlans.topic, topic), eq(schema.labPlans.status, "active")));
  const [row] = await db.insert(schema.labPlans).values({ playerId, topic, variant: variantKey, origin, goals, baseline }).returning({ id: schema.labPlans.id });
  await event(playerId, ctx.user.id, "plan_created", `Plano: ${t.short} — ${v.label}`, { planId: row.id, topic, variant: variantKey });
  revalidate();
  redirect(`/app/lab/treinador/${topic}?v=${variantKey}&plano=1`);
}

export async function toggleGoalAction(planId: string, goalId: string) {
  const { ctx, playerId } = await ownPlayer();
  const [p] = await db.select().from(schema.labPlans).where(and(eq(schema.labPlans.id, planId), eq(schema.labPlans.playerId, playerId)));
  if (!p) throw forbiddenError("Plano não encontrado.");
  let doneNow = false, text = "";
  const goals = p.goals.map((g) => {
    if (g.id !== goalId) return g;
    doneNow = !g.done; text = g.text;
    return { ...g, done: doneNow, doneAt: doneNow ? new Date().toISOString() : null };
  });
  const allDone = goals.length > 0 && goals.every((g) => g.done);
  await db.update(schema.labPlans).set({ goals, status: allDone ? "done" : "active", updatedAt: new Date() }).where(eq(schema.labPlans.id, planId));
  if (doneNow) await event(playerId, ctx.user.id, "goal_done", `Objetivo concluído: ${text}`, { planId, goalId });
  revalidate();
}

export async function archivePlanAction(planId: string) {
  const { ctx, playerId } = await ownPlayer();
  const res = await db.update(schema.labPlans).set({ status: "archived", updatedAt: new Date() })
    .where(and(eq(schema.labPlans.id, planId), eq(schema.labPlans.playerId, playerId))).returning({ topic: schema.labPlans.topic });
  if (res.length) await event(playerId, ctx.user.id, "plan_archived", "Plano arquivado", { planId, topic: res[0].topic });
  revalidate();
}
