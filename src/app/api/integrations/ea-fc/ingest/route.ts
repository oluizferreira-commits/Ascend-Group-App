/**
 * Receives match data fetched by the local sync agent (scripts/ea-sync-agent.mjs),
 * which runs on a home connection the EA CDN accepts.
 * Auth: Authorization: Bearer $EA_SYNC_TOKEN
 */
import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { bearerMatches } from "@/server/token-auth";
import { applyMembersPayload, runLoggedImport } from "@/server/services/ea-sync";
import { EA_MATCH_TYPES } from "@/integrations/ea-fc/types";

const bodySchema = z.object({
  eaClubId: z.string().regex(/^\d{1,15}$/),
  batches: z.array(z.object({ matchType: z.enum(EA_MATCH_TYPES), payload: z.unknown() })).min(1).max(5),
  members: z.unknown().optional(),
});

export async function POST(req: NextRequest) {
  if (!bearerMatches(req.headers.get("authorization"), process.env.EA_SYNC_TOKEN)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > 3_000_000) return NextResponse.json({ error: "payload too large" }, { status: 413 });
  let body: z.infer<typeof bodySchema>;
  try {
    body = bodySchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const [club] = await db.select({ id: schema.clubs.id }).from(schema.clubs).where(eq(schema.clubs.eaClubId, body.eaClubId));
  if (!club) return NextResponse.json({ error: "club not configured" }, { status: 404 });
  const log = await runLoggedImport({ clubId: club.id, eaClubId: body.eaClubId, trigger: "scheduled", userId: null, origin: "agent", batches: body.batches });
  const changes = body.members ? await applyMembersPayload(club.id, body.members, "agent") : [];
  await db.insert(schema.auditLogs).values({ clubId: club.id, action: "integration.agent_ingest", entityType: "synchronization_log", entityId: log.id, metadata: { status: log.status, overallChanges: changes.length } });
  return NextResponse.json({
    status: log.status, overallChanges: changes.length, found: log.itemsFound, created: log.itemsCreated, skipped: log.itemsSkipped, error: log.errorMessage,
    unmatchedPlayers: (log.details as { unmatchedPlayers?: unknown }).unmatchedPlayers ?? [],
  });
}
