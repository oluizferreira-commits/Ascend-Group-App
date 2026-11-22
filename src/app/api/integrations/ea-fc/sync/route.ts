/**
 * Scheduled server-side sync (e.g. Vercel Cron / GitHub Actions).
 * Auth: Authorization: Bearer $SYNC_CRON_SECRET. Only works where the EA CDN
 * accepts the host's IP; otherwise the log records the block and the local
 * agent should be used.
 */
import { NextResponse, type NextRequest } from "next/server";
import { isNotNull } from "drizzle-orm";
import { db, schema } from "@/db";
import { bearerMatches } from "@/server/token-auth";
import { MIN_SYNC_INTERVAL_MS, fetchAllMatchTypes, lastServerFetch, runLoggedImport, syncMembersFromEa } from "@/server/services/ea-sync";
import { EA_PLATFORMS, type EaPlatform } from "@/integrations/ea-fc/types";

export async function GET(req: NextRequest) {
  if (!bearerMatches(req.headers.get("authorization"), process.env.SYNC_CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const clubs = await db.select().from(schema.clubs).where(isNotNull(schema.clubs.eaClubId));
  const results = [];
  for (const c of clubs) {
    if (!EA_PLATFORMS.includes(c.eaPlatform as EaPlatform)) continue;
    const last = await lastServerFetch(c.id);
    if (last && Date.now() - last.startedAt.getTime() < MIN_SYNC_INTERVAL_MS) {
      results.push({ club: c.slug, skipped: "too soon" });
      continue;
    }
    const log = await runLoggedImport({
      clubId: c.id, eaClubId: c.eaClubId!, trigger: "scheduled", userId: null, origin: "server",
      batches: () => fetchAllMatchTypes(c.eaPlatform as EaPlatform, c.eaClubId!),
    });
    const changes = await syncMembersFromEa(c.id, c.eaPlatform as EaPlatform, c.eaClubId!);
    results.push({ club: c.slug, status: log.status, created: log.itemsCreated, overallChanges: changes.length, error: log.errorMessage });
  }
  return NextResponse.json({ results });
}
