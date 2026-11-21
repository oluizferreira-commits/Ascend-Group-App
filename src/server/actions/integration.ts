"use server";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireAction } from "../auth/session";
import { audit } from "../audit";
import type { ActionResult } from "../errors";
import { EA_MATCH_TYPES, EA_PLATFORMS, type EaMatchType } from "@/integrations/ea-fc/types";
import { MIN_SYNC_INTERVAL_MS, PROVIDER, fetchAllMatchTypes, fetchMembers, getEaConfig, lastServerFetch, latestMembersSnapshot, runLoggedImport, storeMembersSnapshot } from "../services/ea-sync";
import { EA_LINE_TO_POSITION } from "@/integrations/ea-fc/mapper";
import { pgErrorCode } from "../errors";
import { sql } from "drizzle-orm";

const MAX_JSON_BYTES = 2_000_000;

const configSchema = z.object({
  platform: z.enum(EA_PLATFORMS),
  eaClubId: z.string().trim().regex(/^\d{1,15}$/, "O ID do clube na EA é numérico"),
});

export async function saveEaConfigAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const ctx = await requireAction("integration.manage");
  const parsed = configSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { ok: false, error: "Verifique os campos.", fieldErrors: z.flattenError(parsed.error).fieldErrors };
  await db.update(schema.clubs).set({ eaPlatform: parsed.data.platform, eaClubId: parsed.data.eaClubId }).where(eq(schema.clubs.id, ctx.club.id));
  await audit(ctx, "integration.configure", "club", ctx.club.id, parsed.data);
  revalidatePath("/app/integracao");
  return { ok: true, message: "Configuração salva." };
}

function summarize(log: typeof schema.synchronizationLogs.$inferSelect): ActionResult {
  const d = log.details as { statsAdded?: number; unmatchedPlayers?: unknown[] };
  const base = `${log.itemsFound} encontradas · ${log.itemsCreated} novas · ${log.itemsSkipped} já existentes · ${d.statsAdded ?? 0} linhas de estatística.`;
  if (log.status === "failed") return { ok: false, error: log.errorMessage ?? "Falha na importação." };
  return { ok: true, message: log.status === "partial" ? `Importação parcial: ${base} Erros: ${log.errorMessage}` : `Importação concluída: ${base}` };
}

export async function syncNowAction(_prev: ActionResult | null): Promise<ActionResult> {
  void _prev;
  const ctx = await requireAction("integration.manage");
  const cfg = await getEaConfig(ctx.club.id);
  if (!cfg.platform || !cfg.eaClubId) return { ok: false, error: "Configure a plataforma e o ID do clube na EA primeiro." };
  const last = await lastServerFetch(ctx.club.id);
  if (last && Date.now() - last.startedAt.getTime() < MIN_SYNC_INTERVAL_MS) {
    return { ok: false, error: "Aguarde 10 minutos entre sincronizações pelo servidor (evita sobrecarga na EA)." };
  }
  const log = await runLoggedImport({
    clubId: ctx.club.id, eaClubId: cfg.eaClubId, trigger: "manual", userId: ctx.user.id, origin: "server",
    batches: () => fetchAllMatchTypes(cfg.platform!, cfg.eaClubId!),
  });
  await audit(ctx, "integration.sync", "synchronization_log", log.id, { status: log.status });
  revalidatePath("/app", "layout");
  return summarize(log);
}

export async function importJsonAction(_prev: ActionResult | null, form: FormData): Promise<ActionResult> {
  const ctx = await requireAction("integration.manage");
  const cfg = await getEaConfig(ctx.club.id);
  if (!cfg.eaClubId) return { ok: false, error: "Configure o ID do clube na EA primeiro." };
  const matchType = String(form.get("matchType"));
  if (!EA_MATCH_TYPES.includes(matchType as EaMatchType)) return { ok: false, error: "Tipo de partida inválido." };
  const file = form.get("file");
  let text = String(form.get("json") ?? "").trim();
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_JSON_BYTES) return { ok: false, error: "Arquivo muito grande (máx. 2 MB)." };
    text = await file.text();
  }
  if (!text) return { ok: false, error: "Cole o JSON ou escolha um arquivo." };
  if (text.length > MAX_JSON_BYTES) return { ok: false, error: "JSON muito grande (máx. 2 MB)." };
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    return { ok: false, error: "O conteúdo não é um JSON válido." };
  }
  if (payload && typeof payload === "object" && !Array.isArray(payload) && "members" in payload) {
    try {
      const snap = await storeMembersSnapshot(ctx.club.id, ctx.user.id, payload, "json");
      await audit(ctx, "integration.import_members", "synchronization_log", snap.id, { members: snap.itemsFound });
    } catch (e) {
      return { ok: false, error: (e as Error).message };
    }
    revalidatePath("/app/integracao");
    return { ok: true, message: "Elenco da EA carregado. Vincule ou crie os jogadores abaixo." };
  }
  const log = await runLoggedImport({
    clubId: ctx.club.id, eaClubId: cfg.eaClubId, trigger: "file", userId: ctx.user.id, origin: "json",
    batches: [{ matchType: matchType as EaMatchType, payload }],
  });
  await audit(ctx, "integration.import_json", "synchronization_log", log.id, { status: log.status, matchType });
  revalidatePath("/app", "layout");
  return summarize(log);
}

export async function reprocessLogAction(logId: string): Promise<void> {
  const ctx = await requireAction("integration.manage");
  const cfg = await getEaConfig(ctx.club.id);
  const [log] = await db.select().from(schema.synchronizationLogs).where(and(
    eq(schema.synchronizationLogs.id, logId), eq(schema.synchronizationLogs.clubId, ctx.club.id), eq(schema.synchronizationLogs.provider, PROVIDER),
  ));
  const batches = (log?.details as { batches?: { matchType: EaMatchType; payload: unknown }[] })?.batches;
  if (!log || !cfg.eaClubId || !batches?.length) return;
  const redo = await runLoggedImport({ clubId: ctx.club.id, eaClubId: cfg.eaClubId, trigger: "manual", userId: ctx.user.id, origin: `reprocess:${logId}`, batches });
  await audit(ctx, "integration.reprocess", "synchronization_log", redo.id, { from: logId, status: redo.status });
  revalidatePath("/app", "layout");
}

export async function fetchMembersAction(_prev: ActionResult | null): Promise<ActionResult> {
  void _prev;
  const ctx = await requireAction("integration.manage");
  const cfg = await getEaConfig(ctx.club.id);
  if (!cfg.platform || !cfg.eaClubId) return { ok: false, error: "Configure a plataforma e o ID do clube na EA primeiro." };
  try {
    const snap = await storeMembersSnapshot(ctx.club.id, ctx.user.id, await fetchMembers(cfg.platform, cfg.eaClubId), "server");
    await audit(ctx, "integration.import_members", "synchronization_log", snap.id, { members: snap.itemsFound });
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  revalidatePath("/app/integracao");
  return { ok: true, message: "Elenco da EA atualizado." };
}

/** Creates a roster player from an EA member of the latest snapshot (linked by EA name). */
export async function createPlayerFromEaAction(eaName: string): Promise<void> {
  const ctx = await requireAction("players.manage");
  const snap = await latestMembersSnapshot(ctx.club.id);
  const m = snap?.members.find((x) => x.name === eaName);
  if (!m) return;
  const [exists] = await db.select({ id: schema.players.id }).from(schema.players)
    .where(and(eq(schema.players.clubId, ctx.club.id), sql`lower(${schema.players.eaName}) = lower(${m.name})`));
  if (exists) return;
  const position = EA_LINE_TO_POSITION[(m.favoritePosition ?? "") as keyof typeof EA_LINE_TO_POSITION] ?? "CM";
  try {
    const [p] = await db.insert(schema.players).values({
      clubId: ctx.club.id, fullName: m.name, nickname: m.name.slice(0, 40), eaName: m.name, primaryPosition: position,
      overall: m.proOverall != null && m.proOverall >= 1 && m.proOverall <= 99 ? m.proOverall : null, status: "available",
    }).returning({ id: schema.players.id });
    await audit(ctx, "player.create_from_ea", "player", p.id, { eaName: m.name });
  } catch (e) {
    if (pgErrorCode(e) !== "23505") throw e;
  }
  revalidatePath("/app/integracao");
  revalidatePath("/app/elenco");
}
