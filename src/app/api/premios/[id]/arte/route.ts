import { NextResponse } from "next/server";
import { getAuthContext } from "@/server/auth/session";
import { getEdition } from "@/server/services/awards";
import { currentSeasonInfo, getCardsData } from "@/server/services/player-card";
import { avatarDataUrl, renderShareCard } from "@/server/media/share-images";
import { AWARD_LABELS } from "@/lib/awards";

/** Winner art: the player's card framed with the award title. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await getAuthContext();
  if (!ctx || !ctx.permissions.has("dashboard.view")) return NextResponse.json({ error: "Sem permissão." }, { status: 403 });
  const { id } = await params;
  const e = /^[0-9a-f-]{36}$/i.test(id) ? await getEdition(ctx.club.id, id) : null;
  if (!e?.winnerPlayerId) return NextResponse.json({ error: "Edição sem vencedor." }, { status: 404 });
  const { seasonId } = await currentSeasonInfo(ctx.club.id);
  const { cards } = await getCardsData(ctx.club.id, seasonId);
  const c = cards.get(e.winnerPlayerId);
  if (!c) return NextResponse.json({ error: "Jogador não encontrado." }, { status: 404 });
  const img = await renderShareCard({
    nickname: c.player.nickname, position: c.player.primaryPosition, shirtNumber: c.player.shirtNumber,
    photo: await avatarDataUrl(c.player.avatarUrl), photoX: c.player.photoX, photoY: c.player.photoY, photoZoom: c.player.photoZoom, ovr: c.ovr.value, attributes: c.attributes,
    seasonLabel: e.label.replace("Semana de ", ""), // award name is already in the header
  }, `${AWARD_LABELS[e.kind].toUpperCase()} · ${e.label.toUpperCase()}`);
  const h = new Headers(img.headers);
  h.set("Cache-Control", "private, no-store");
  return new Response(img.body, { headers: h });
}
