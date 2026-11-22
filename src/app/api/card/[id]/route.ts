import { NextResponse } from "next/server";
import { getAuthContext } from "@/server/auth/session";
import { currentSeasonInfo, getCardsData } from "@/server/services/player-card";
import { avatarDataUrl, renderShareCard } from "@/server/media/share-images";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx || !ctx.permissions.has("players.view")) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error: "Jogador inválido." }, { status: 404 });
  const { seasonId, seasonName } = await currentSeasonInfo(ctx.club.id);
  const { cards } = await getCardsData(ctx.club.id, seasonId);
  const c = cards.get(id);
  if (!c) return NextResponse.json({ error: "Jogador não encontrado." }, { status: 404 });
  const img = await renderShareCard({
    nickname: c.player.nickname, position: c.player.primaryPosition, shirtNumber: c.player.shirtNumber,
    photo: await avatarDataUrl(c.player.avatarUrl), ovr: c.ovr.value, attributes: c.attributes,
    seasonLabel: seasonName ? `Temporada ${seasonName}` : "Ascend CF",
  });
  const h = new Headers(img.headers);
  h.set("Cache-Control", "private, no-store");
  return new Response(img.body, { headers: h });
}
