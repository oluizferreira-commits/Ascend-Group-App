"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, max } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireAction } from "../auth/session";
import { audit } from "../audit";
import { pgErrorCode, type ActionResult } from "../errors";
import { validateTable, type CostTableData } from "@/lib/lab/ap-engine";
import { getCostTable } from "../services/cost-tables";

const MAX_JSON = 1_000_000;
const PATH = "/app/admin/custos-builds";

const dataSchema = z.object({
  attrs: z.record(z.string(), z.object({ base: z.number(), max: z.number(), costs: z.array(z.number()) })),
  levelBudget: z.record(z.string(), z.number()).default({}),
  modifiers: z.object({
    heightCm: z.array(z.object({ min: z.number(), max: z.number(), deltas: z.record(z.string(), z.number()) })).optional(),
    weightKg: z.array(z.object({ min: z.number(), max: z.number(), deltas: z.record(z.string(), z.number()) })).optional(),
    specializations: z.record(z.string(), z.record(z.string(), z.number())).optional(),
  }).optional(),
});

async function readData(form: FormData): Promise<{ ok: true; data: CostTableData } | { ok: false; error: string }> {
  const file = form.get("file");
  let text = String(form.get("json") ?? "").trim();
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_JSON) return { ok: false, error: "Arquivo muito grande (máx. 1 MB)." };
    text = (await file.text()).trim();
  }
  if (!text) return { ok: false, error: "Cole o JSON da tabela ou escolha um arquivo." };
  if (text.length > MAX_JSON) return { ok: false, error: "JSON muito grande (máx. 1 MB)." };
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { return { ok: false, error: "O conteúdo não é um JSON válido." }; }
  const parsed = dataSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: `Formato não reconhecido: ${parsed.error.issues[0]?.path.join(".")} — ${parsed.error.issues[0]?.message}. Use o modelo.` };
  const data = parsed.data as CostTableData;
  const errors = validateTable(data).filter((i) => i.level === "error");
  if (errors.length) return { ok: false, error: `A tabela tem ${errors.length} erro(s): ${errors.slice(0, 3).map((e) => e.message).join(" · ")}` };
  return { ok: true, data };
}

const metaSchema = z.object({
  gameVersion: z.string().trim().min(2).max(60),
  season: z.string().trim().min(1, "Informe a temporada").max(60),
  archetype: z.string().trim().min(1, "Informe o arquétipo").max(60),
  source: z.string().trim().max(200).transform((v) => v || null),
  sourceUrl: z.string().trim().max(500).transform((v) => v || null).refine((v) => v == null || /^https:\/\//.test(v), "Use um link https"),
  notes: z.string().trim().max(2000).transform((v) => v || null),
});

/** Import a new table as DRAFT (next revision for that version/season/archetype). */
export async function importCostTableAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const ctx = await requireAction("gamedata.manage");
  const meta = metaSchema.safeParse(Object.fromEntries(form));
  if (!meta.success) return { ok: false, error: "Confira os campos.", fieldErrors: z.flattenError(meta.error).fieldErrors };
  const d = await readData(form);
  if (!d.ok) return { ok: false, error: d.error };
  const m = meta.data;
  let id = "";
  try {
    id = await db.transaction(async (tx) => {
      const [{ rev }] = await tx.select({ rev: max(schema.labCostTables.revision) }).from(schema.labCostTables)
        .where(and(eq(schema.labCostTables.gameVersion, m.gameVersion), eq(schema.labCostTables.season, m.season), eq(schema.labCostTables.archetype, m.archetype)));
      const [row] = await tx.insert(schema.labCostTables).values({ ...m, revision: (rev ?? 0) + 1, data: d.data, createdBy: ctx.user.id }).returning({ id: schema.labCostTables.id });
      return row.id;
    });
  } catch (e) {
    if (pgErrorCode(e) === "23505") return { ok: false, error: "Outra importação criou esta revisão ao mesmo tempo. Tente de novo." };
    throw e;
  }
  await audit(ctx, "gamedata.import", "lab_cost_table", id, { ...m });
  revalidatePath(PATH);
  redirect(`${PATH}/${id}?importada=1`);
}

/** Replace the data of a DRAFT table (verified tables are immutable). */
export async function replaceDraftDataAction(id: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const ctx = await requireAction("gamedata.manage");
  const t = await getCostTable(id);
  if (!t) return { ok: false, error: "Tabela não encontrada." };
  if (t.status !== "draft") return { ok: false, error: "Tabelas verificadas não mudam. Crie uma nova revisão." };
  const d = await readData(form);
  if (!d.ok) return { ok: false, error: d.error };
  await db.update(schema.labCostTables).set({ data: d.data, updatedAt: new Date() }).where(eq(schema.labCostTables.id, id));
  await audit(ctx, "gamedata.replace_draft", "lab_cost_table", id, {});
  revalidatePath(`${PATH}/${id}`);
  return { ok: true, message: "Dados do rascunho atualizados." };
}

const verifySchema = z.object({
  source: z.string().trim().min(3, "Informe a fonte").max(200),
  sourceUrl: z.string().trim().max(500).transform((v) => v || null).refine((v) => v == null || /^https:\/\//.test(v), "Use um link https"),
  verifiedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida"),
  confirm: z.literal("on", { message: "Confirme que conferiu a tabela com a fonte" }),
});

/** Mark a draft as verified. Requires source, date, explicit confirmation and no structural errors. */
export async function verifyCostTableAction(id: string, _prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const ctx = await requireAction("gamedata.manage");
  const t = await getCostTable(id);
  if (!t || t.status !== "draft") return { ok: false, error: "Só rascunhos podem ser verificados." };
  const v = verifySchema.safeParse(Object.fromEntries(form));
  if (!v.success) return { ok: false, error: "Confira os campos.", fieldErrors: z.flattenError(v.error).fieldErrors };
  const errors = validateTable(t.data).filter((i) => i.level === "error");
  if (errors.length) return { ok: false, error: "A tabela tem erros estruturais — corrija antes de verificar." };
  await db.update(schema.labCostTables).set({ status: "verified", source: v.data.source, sourceUrl: v.data.sourceUrl, verifiedOn: v.data.verifiedOn, verifiedBy: ctx.user.id, updatedAt: new Date() })
    .where(eq(schema.labCostTables.id, id));
  await audit(ctx, "gamedata.verify", "lab_cost_table", id, { source: v.data.source, verifiedOn: v.data.verifiedOn });
  revalidatePath(PATH, "layout");
  redirect(`${PATH}/${id}?verificada=1`);
}

export async function archiveCostTableAction(id: string) {
  const ctx = await requireAction("gamedata.manage");
  await db.update(schema.labCostTables).set({ status: "archived", updatedAt: new Date() }).where(and(eq(schema.labCostTables.id, id), eq(schema.labCostTables.status, "verified")));
  await audit(ctx, "gamedata.archive", "lab_cost_table", id, {});
  revalidatePath(PATH, "layout");
}

/** Start a correction: copy any table into a new DRAFT revision. */
export async function newRevisionAction(id: string) {
  const ctx = await requireAction("gamedata.manage");
  const t = await getCostTable(id);
  if (!t) return;
  const newId = await db.transaction(async (tx) => {
    const [{ rev }] = await tx.select({ rev: max(schema.labCostTables.revision) }).from(schema.labCostTables)
      .where(and(eq(schema.labCostTables.gameVersion, t.gameVersion), eq(schema.labCostTables.season, t.season), eq(schema.labCostTables.archetype, t.archetype)));
    const [row] = await tx.insert(schema.labCostTables).values({
      gameVersion: t.gameVersion, season: t.season, archetype: t.archetype, revision: (rev ?? 0) + 1, data: t.data,
      notes: `Revisão criada a partir da rev. ${t.revision}.`, createdBy: ctx.user.id,
    }).returning({ id: schema.labCostTables.id });
    return row.id;
  });
  await audit(ctx, "gamedata.new_revision", "lab_cost_table", newId, { from: id });
  revalidatePath(PATH);
  redirect(`${PATH}/${newId}`);
}

export async function deleteDraftAction(id: string) {
  const ctx = await requireAction("gamedata.manage");
  const t = await getCostTable(id);
  if (t?.status === "draft") {
    const used = await db.select({ id: schema.labBuilds.id }).from(schema.labBuilds).where(eq(schema.labBuilds.costTableId, id)).limit(1);
    if (!used.length) {
      await db.delete(schema.labCostTables).where(eq(schema.labCostTables.id, id));
      await audit(ctx, "gamedata.delete_draft", "lab_cost_table", id, {});
    }
  }
  revalidatePath(PATH);
  redirect(PATH);
}
