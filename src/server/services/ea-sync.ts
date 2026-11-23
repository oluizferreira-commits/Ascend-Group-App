import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { notify } from "../notify";
import { eaGet, eaUrl, matchesUrl, EaBlockedError } from "@/integrations/ea-fc/client";
import { importEaMatches, type ImportSummary } from "@/integrations/ea-fc/importer";
import { syncOveralls } from "@/integrations/ea-fc/overalls";
import { EA_MATCH_TYPES, EA_PLATFORMS, eaMembersResponseSchema, type EaMatchType, type EaPlatform } from "@/integrations/ea-fc/types";

export const PROVIDER = "ea_fc";
/** Minimum spacing between server-side fetches for one club. */
export const MIN_SYNC_INTERVAL_MS = 10 * 60_000;

export async function getEaConfig(clubId: string) {
  const [c] = await db.select({ platform: schema.clubs.eaPlatform, eaClubId: schema.clubs.eaClubId }).from(schema.clubs).where(eq(schema.clubs.id, clubId));
  const platform = EA_PLATFORMS.includes(c?.platform as EaPlatform) ? (c!.platform as EaPlatform) : null;
  return { platform, eaClubId: c?.eaClubId ?? null };
}

export async function listSyncLogs(clubId: string, limit = 30) {
  return db.select().from(schema.synchronizationLogs)
    .where(and(eq(schema.synchronizationLogs.clubId, clubId), eq(schema.synchronizationLogs.provider, PROVIDER)))
    .orderBy(desc(schema.synchronizationLogs.startedAt)).limit(limit);
}

type Batch = { matchType: EaMatchType; payload: unknown };

/**
 * Runs an import with a synchronization log. Raw payloads are stored in the log
 * so a run can be reprocessed later (e.g. after linking players).
 */
export async function runLoggedImport(opts: {
  clubId: string; eaClubId: string; trigger: "manual" | "scheduled" | "file"; userId: string | null;
  batches: Batch[] | (() => Promise<Batch[]>); origin: string; logId?: string;
}) {
  const [log] = opts.logId
    ? await db.select().from(schema.synchronizationLogs).where(eq(schema.synchronizationLogs.id, opts.logId))
    : await db.insert(schema.synchronizationLogs).values({
        clubId: opts.clubId, provider: PROVIDER, trigger: opts.trigger, triggeredBy: opts.userId, details: { origin: opts.origin },
      }).returning();
  const totals: ImportSummary = { found: 0, created: 0, skipped: 0, statsAdded: 0, invalid: [], unmatchedPlayers: [] };
  const errors: string[] = [];
  let batches: Batch[] = [];
  try {
    batches = typeof opts.batches === "function" ? await opts.batches() : opts.batches;
    for (const b of batches) {
      try {
        const r = await importEaMatches(db, { clubId: opts.clubId, eaClubId: opts.eaClubId, matchType: b.matchType, payload: b.payload });
        totals.found += r.found; totals.created += r.created; totals.skipped += r.skipped; totals.statsAdded += r.statsAdded;
        totals.invalid.push(...r.invalid);
        for (const u of r.unmatchedPlayers) {
          const ex = totals.unmatchedPlayers.find((x) => x.eaName.toLowerCase() === u.eaName.toLowerCase());
          if (ex) { ex.matches += u.matches; ex.goals += u.goals; ex.assists += u.assists; } else totals.unmatchedPlayers.push({ ...u });
        }
      } catch (e) {
        errors.push(`${b.matchType}: ${(e as Error).message}`);
      }
    }
  } catch (e) {
    errors.push((e as Error).message);
  }
  const status = errors.length === 0 ? "success" : totals.found > 0 ? "partial" : "failed";
  const [done] = await db.update(schema.synchronizationLogs).set({
    status, finishedAt: new Date(), itemsFound: totals.found, itemsCreated: totals.created, itemsSkipped: totals.skipped,
    errorMessage: errors.length ? errors.join(" | ").slice(0, 2000) : null,
    details: {
      origin: opts.origin, statsAdded: totals.statsAdded, invalid: totals.invalid.slice(0, 50), unmatchedPlayers: totals.unmatchedPlayers,
      blocked: errors.some((e) => e.includes("403")),
      // Raw payloads (public match data only) kept for safe reprocessing.
      batches: batches.map((b) => ({ matchType: b.matchType, payload: b.payload })),
    },
  }).where(eq(schema.synchronizationLogs.id, log.id)).returning();
  if (totals.created > 0) {
    await notify(opts.clubId, { kind: "members" }, {
      type: "match.result", title: `${totals.created} ${totals.created === 1 ? "nova partida importada" : "novas partidas importadas"} da EA`,
      body: "Resultados e estatísticas atualizados.", link: "/app/partidas",
    });
  }
  return done;
}

export async function fetchAllMatchTypes(platform: EaPlatform, eaClubId: string): Promise<Batch[]> {
  const out: Batch[] = [];
  for (const t of EA_MATCH_TYPES) {
    try {
      out.push({ matchType: t, payload: await eaGet(matchesUrl(platform, eaClubId, t)) });
    } catch (e) {
      if (e instanceof EaBlockedError) throw e; // stop immediately — don't hammer a blocking CDN
      throw new Error(`${t}: ${(e as Error).message}`);
    }
  }
  return out;
}

export async function lastServerFetch(clubId: string) {
  const logs = await listSyncLogs(clubId, 20);
  return logs.find((l) => FETCH_ORIGINS.includes(String((l.details as { origin?: string }).origin)));
}

export const AUTO_SYNC_INTERVAL_MIN = 15;
/** Club-wide pause between "Atualizar agora" presses (protects the EA endpoints). */
export const BUTTON_COOLDOWN_S = 60;
/** Log origins that mean "the server fetched EA" (cron, visits, button). */
const FETCH_ORIGINS = ["server", "auto", "button"];

/**
 * Atomically claims a fetch slot: inserts a running log only if no server-side fetch
 * started in the last `seconds`. Returns the new log id, or null when throttled.
 */
async function claimFetchSlot(clubId: string, seconds: number, origin: string, trigger: "manual" | "scheduled", userId: string | null) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${"ea-auto-sync:" + clubId}))`);
    const rows = await tx.execute<{ id: string }>(sql`
      insert into synchronization_logs (club_id, provider, trigger, triggered_by, details)
      select ${clubId}::uuid, ${PROVIDER}::text, ${trigger}::sync_trigger, ${userId}::uuid, jsonb_build_object('origin', ${origin}::text)
      where not exists (
        select 1 from synchronization_logs
        where club_id = ${clubId} and provider = ${PROVIDER}
          and details->>'origin' in ('server', 'auto', 'button')
          and started_at > now() - make_interval(secs => ${seconds})
      )
      returning id`);
    return [...rows][0]?.id ?? null;
  });
}

/** Last time EA data was fetched successfully (any origin, including the local agent). */
export async function lastEaUpdate(clubId: string) {
  const [r] = await db.select({ at: sql<Date | null>`max(coalesce(${schema.synchronizationLogs.finishedAt}, ${schema.synchronizationLogs.startedAt}))` })
    .from(schema.synchronizationLogs)
    .where(and(eq(schema.synchronizationLogs.clubId, clubId), eq(schema.synchronizationLogs.provider, PROVIDER), sql`${schema.synchronizationLogs.status} in ('success', 'partial')`));
  return r?.at ? new Date(r.at) : null;
}

export type RefreshResult = { status: "done"; created: number; overallChanges: number } | { status: "throttled"; retryInS: number } | { status: "failed"; error: string } | { status: "not_configured" };

/** "Atualizar agora": immediate EA fetch for any club member, at most once per BUTTON_COOLDOWN_S per club. */
export async function refreshFromEa(clubId: string, userId: string): Promise<RefreshResult> {
  const cfg = await getEaConfig(clubId);
  if (!cfg.platform || !cfg.eaClubId) return { status: "not_configured" };
  const logId = await claimFetchSlot(clubId, BUTTON_COOLDOWN_S, "button", "manual", userId);
  if (!logId) {
    const last = await lastServerFetch(clubId);
    const left = last ? BUTTON_COOLDOWN_S - Math.floor((Date.now() - last.startedAt.getTime()) / 1000) : BUTTON_COOLDOWN_S;
    return { status: "throttled", retryInS: Math.max(1, left) };
  }
  const log = await runLoggedImport({
    clubId, eaClubId: cfg.eaClubId, trigger: "manual", userId, origin: "button", logId,
    batches: () => fetchAllMatchTypes(cfg.platform!, cfg.eaClubId!),
  });
  if (log.status === "failed") return { status: "failed", error: log.errorMessage ?? "A EA não respondeu." };
  const changes = await syncMembersFromEa(clubId, cfg.platform, cfg.eaClubId).catch(() => []);
  return { status: "done", created: log.itemsCreated, overallChanges: changes.length };
}

/**
 * Opportunistic sync: called (via `after()`) when someone opens the app. Claims the
 * slot atomically with a conditional insert, so concurrent visits fetch EA at most
 * once per AUTO_SYNC_INTERVAL_MIN. Never throws.
 */
export async function maybeAutoSync(clubId: string) {
  try {
    const cfg = await getEaConfig(clubId);
    if (!cfg.platform || !cfg.eaClubId) return;
    const logId = await claimFetchSlot(clubId, AUTO_SYNC_INTERVAL_MIN * 60, "auto", "scheduled", null);
    if (!logId) return;
    await runLoggedImport({
      clubId, eaClubId: cfg.eaClubId, trigger: "scheduled", userId: null, origin: "auto", logId,
      batches: () => fetchAllMatchTypes(cfg.platform!, cfg.eaClubId!),
    });
    await syncMembersFromEa(clubId, cfg.platform, cfg.eaClubId);
  } catch (e) {
    console.error("[auto-sync] failed", e);
  }
}

export type MemberSnapshot = { name: string; favoritePosition: string | null; proOverall: number | null; gamesPlayed: number | null; goals: number | null; assists: number | null };

/** Stores the EA members list (public data) so staff can link/create players from it. */
export async function storeMembersSnapshot(clubId: string, userId: string | null, payload: unknown, origin: string) {
  const parsed = eaMembersResponseSchema.safeParse(payload);
  if (!parsed.success) throw new Error("Formato de membros da EA não reconhecido. Envie a resposta do endpoint members/stats.");
  const members: MemberSnapshot[] = parsed.data.members.map((m) => ({
    name: m.name.trim().slice(0, 60), favoritePosition: m.favoritePosition ?? null, proOverall: m.proOverall ?? null,
    gamesPlayed: m.gamesPlayed ?? null, goals: m.goals ?? null, assists: m.assists ?? null,
  }));
  const [log] = await db.insert(schema.synchronizationLogs).values({
    clubId, provider: PROVIDER, trigger: origin === "server" ? "manual" : "file", status: "success", triggeredBy: userId,
    finishedAt: new Date(), itemsFound: members.length, details: { origin: `members:${origin}`, members },
  }).returning();
  return log;
}

export async function fetchMembers(platform: EaPlatform, eaClubId: string) {
  return eaGet(eaUrl("members/stats", { platform, clubId: eaClubId }));
}

export async function latestMembersSnapshot(clubId: string) {
  const logs = await listSyncLogs(clubId, 50);
  const log = logs.find((l) => String((l.details as { origin?: string }).origin ?? "").startsWith("members:"));
  return log ? { at: log.startedAt, members: (log.details as { members: MemberSnapshot[] }).members } : null;
}

/**
 * Members refresh: stores the snapshot (roster linking screen) and updates every linked
 * player's overall from EA. Players whose overall went UP get a notification. Never throws.
 */
export async function applyMembersPayload(clubId: string, payload: unknown, origin: string) {
  try {
    await storeMembersSnapshot(clubId, null, payload, origin);
    const changes = await syncOveralls(db, clubId, payload);
    for (const c of changes) {
      if (c.from != null && c.to > c.from) {
        await notify(clubId, { kind: "players", playerIds: [c.playerId] }, {
          type: "overall.up", title: `Seu overall subiu para ${c.to}! (+${c.to - c.from})`, body: "Sua carta já foi atualizada.", link: "/app/eu",
        });
      }
    }
    return changes;
  } catch (e) {
    console.error("[overall-sync] failed", e);
    return [];
  }
}

export async function syncMembersFromEa(clubId: string, platform: EaPlatform, eaClubId: string) {
  return applyMembersPayload(clubId, await fetchMembers(platform, eaClubId), "server");
}
