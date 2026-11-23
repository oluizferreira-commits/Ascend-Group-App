import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { CostTable } from "@/lib/lab/ap-engine";

export type CostTableRow = typeof schema.labCostTables.$inferSelect;

export const toEngine = (r: CostTableRow): CostTable => ({
  id: r.id, gameVersion: r.gameVersion, season: r.season, archetype: r.archetype, revision: r.revision,
  status: r.status as CostTable["status"], source: r.source, verifiedOn: r.verifiedOn, data: r.data,
});

export async function listCostTables() {
  const rows = await db.select().from(schema.labCostTables)
    .orderBy(asc(schema.labCostTables.gameVersion), asc(schema.labCostTables.season), asc(schema.labCostTables.archetype), desc(schema.labCostTables.revision));
  const usage = rows.length
    ? await db.select({ id: schema.labBuilds.costTableId, n: sql<number>`count(*)::int` }).from(schema.labBuilds)
      .where(inArray(schema.labBuilds.costTableId, rows.map((r) => r.id))).groupBy(schema.labBuilds.costTableId)
    : [];
  const used = new Map(usage.map((u) => [u.id, u.n]));
  return rows.map((r) => ({ ...r, builds: used.get(r.id) ?? 0 }));
}

export async function getCostTable(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [r] = await db.select().from(schema.labCostTables).where(eq(schema.labCostTables.id, id));
  return r ?? null;
}

/**
 * Tables offered in the builder: verified ones; drafts only for people who manage game data (preview, never saved);
 * plus the exact revision an existing build was calculated with, even if archived since.
 */
export async function editorCostTables(opts: { includeDrafts: boolean; keepId?: string | null }) {
  const rows = await db.select().from(schema.labCostTables)
    .where(inArray(schema.labCostTables.status, opts.includeDrafts ? ["verified", "draft"] : ["verified"]))
    .orderBy(asc(schema.labCostTables.archetype), desc(schema.labCostTables.revision));
  if (opts.keepId && !rows.some((r) => r.id === opts.keepId)) {
    const kept = await getCostTable(opts.keepId);
    if (kept) rows.unshift(kept);
  }
  return rows.map(toEngine);
}

/** Latest revision for the same (version, season, archetype) — to tell users an old build has a newer table. */
export async function latestRevisionFor(t: Pick<CostTableRow, "gameVersion" | "season" | "archetype">) {
  const [r] = await db.select({ id: schema.labCostTables.id, revision: schema.labCostTables.revision, status: schema.labCostTables.status })
    .from(schema.labCostTables)
    .where(and(eq(schema.labCostTables.gameVersion, t.gameVersion), eq(schema.labCostTables.season, t.season), eq(schema.labCostTables.archetype, t.archetype), eq(schema.labCostTables.status, "verified")))
    .orderBy(desc(schema.labCostTables.revision)).limit(1);
  return r ?? null;
}
