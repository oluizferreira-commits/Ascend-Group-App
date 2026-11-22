import { NextResponse, type NextRequest } from "next/server";
import { getAuthContext } from "@/server/auth/session";
import { getClubOverview, listSeasons } from "@/server/services/club";
import { getCardsData } from "@/server/services/player-card";
import { avatarDataUrl, renderShareCompare, type ShareCard } from "@/server/media/share-images";
import { compareSummaries } from "@/lib/compare";

const isId = (v: string | null) => !!v && /^[0-9a-f-]{36}$/i.test(v);

export async function GET(req: NextRequest) {
  const ctx = await getAuthContext();
  if (!ctx || !ctx.permissions.has("stats.view")) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  const q = req.nextUrl.searchParams;
  const a = q.get("a"), b = q.get("b"), season = q.get("season") ?? "current";
  if (!isId(a) || !isId(b) || a === b) return NextResponse.json({ error: "Escolha dois jogadores." }, { status: 400 });
  const [overview, seasons] = await Promise.all([getClubOverview(ctx.club.id), listSeasons(ctx.club.id)]);
  const seasonId = season === "all" ? null : isId(season) && seasons.some((s) => s.id === season) ? season : overview.currentSeason?.id ?? null;
  const label = season === "all" ? "Carreira" : seasons.find((s) => s.id === seasonId)?.name ? `Temporada ${seasons.find((s) => s.id === seasonId)!.name}` : "Ascend CF";
  const { cards } = await getCardsData(ctx.club.id, seasonId);
  const A = cards.get(a!), B = cards.get(b!);
  if (!A || !B) return NextResponse.json({ error: "Jogador não encontrado." }, { status: 404 });
  const toShare = async (c: typeof A): Promise<ShareCard> => ({
    nickname: c.player.nickname, position: c.player.primaryPosition, shirtNumber: c.player.shirtNumber,
    photo: await avatarDataUrl(c.player.avatarUrl), ovr: c.ovr.value, attributes: c.attributes, seasonLabel: label,
  });
  const { rows, score } = compareSummaries(A.summary, B.summary);
  const img = await renderShareCompare(await toShare(A), await toShare(B), score, rows);
  const h = new Headers(img.headers);
  h.set("Cache-Control", "private, no-store");
  return new Response(img.body, { headers: h });
}
