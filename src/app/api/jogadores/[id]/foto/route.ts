import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getAuthContext } from "@/server/auth/session";

/** Player photo for club members. URLs carry a version (?v=) so they can be cached for long. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse(null, { status: 404 });
  const ctx = await getAuthContext();
  if (!ctx || !ctx.permissions.has("players.view")) return new NextResponse(null, { status: 401 });
  const [row] = await db.select({ mime: schema.playerPhotos.mime, data: schema.playerPhotos.data }).from(schema.playerPhotos)
    .innerJoin(schema.players, eq(schema.players.id, schema.playerPhotos.playerId))
    .where(and(eq(schema.playerPhotos.playerId, id), eq(schema.players.clubId, ctx.club.id)));
  if (!row) return new NextResponse(null, { status: 404 });
  return new NextResponse(new Uint8Array(row.data), { headers: { "Content-Type": row.mime, "Cache-Control": "private, max-age=31536000, immutable" } });
}
