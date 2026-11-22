import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getAuthContext } from "@/server/auth/session";

/** Applicant photo: staff with recruitment access; once approved, any club member (roster avatar). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new NextResponse(null, { status: 404 });
  const ctx = await getAuthContext();
  if (!ctx) return new NextResponse(null, { status: 401 });
  const [row] = await db.select({ status: schema.transferApplications.status, mime: schema.applicationPhotos.mime, data: schema.applicationPhotos.data })
    .from(schema.applicationPhotos)
    .innerJoin(schema.transferApplications, eq(schema.transferApplications.id, schema.applicationPhotos.applicationId))
    .where(and(eq(schema.applicationPhotos.applicationId, id), eq(schema.transferApplications.clubId, ctx.club.id)));
  if (!row) return new NextResponse(null, { status: 404 });
  const allowed = ctx.permissions.has("recruitment.manage") || (row.status === "approved" && ctx.permissions.has("players.view"));
  if (!allowed) return new NextResponse(null, { status: 403 });
  return new NextResponse(new Uint8Array(row.data), { headers: { "Content-Type": row.mime, "Cache-Control": "private, max-age=86400" } });
}
