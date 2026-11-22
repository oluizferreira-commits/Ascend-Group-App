import { NextResponse, type NextRequest } from "next/server";
import { getAuthContext } from "@/server/auth/session";
import { FORMATS, MediaDataError, TEMPLATES, loadCard, type FormatKey, type TemplateKey } from "@/server/media/data";
import { renderCard } from "@/server/media/render";

export async function GET(req: NextRequest, { params }: { params: Promise<{ template: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx || !ctx.permissions.has("media.manage")) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const { template } = await params;
  if (!(template in TEMPLATES)) return NextResponse.json({ error: "template" }, { status: 404 });
  const q = req.nextUrl.searchParams;
  const format = (q.get("format") ?? "feed") as FormatKey;
  if (!(format in FORMATS)) return NextResponse.json({ error: "format" }, { status: 400 });
  try {
    const card = await loadCard(ctx.club.id, template as TemplateKey, q);
    const img = await renderCard(card, format);
    const headers = new Headers(img.headers);
    headers.set("Cache-Control", "private, no-store");
    if (q.get("download") === "1") headers.set("Content-Disposition", `attachment; filename="ascend-${template}-${format}.png"`);
    return new Response(img.body, { status: 200, headers });
  } catch (e) {
    if (e instanceof MediaDataError) return NextResponse.json({ error: e.message }, { status: 422 });
    throw e;
  }
}
