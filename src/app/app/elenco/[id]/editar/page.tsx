import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePage } from "@/server/auth/session";
import { getPlayer, linkableUsers } from "@/server/services/players";
import { updatePlayerAction } from "@/server/actions/players";
import { PageHeader } from "@/components/ui/basics";
import { PlayerForm } from "@/components/players/player-form";
import { PhotoEditor } from "@/components/players/photo-editor";
import { currentSeasonInfo, getCardsData } from "@/server/services/player-card";

export const metadata: Metadata = { title: "Editar jogador" };

export default async function EditPlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePage("players.manage");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const player = await getPlayer(ctx.club.id, id);
  if (!player) notFound();
  const [users, { seasonId }] = await Promise.all([linkableUsers(ctx.club.id, id), currentSeasonInfo(ctx.club.id)]);
  const c = (await getCardsData(ctx.club.id, seasonId)).cards.get(id);
  return (
    <>
      <PageHeader eyebrow="Elenco" title={`Editar ${player.nickname}`} />
      <section className="card mb-6 p-5" id="foto">
        <h2 className="mb-1 font-display text-lg font-bold uppercase">Foto da carta</h2>
        <p className="mb-4 text-sm text-ink-400">Envie a foto do jogador e toque em “Remover fundo” para recortar só o jogador. Ajuste a posição e o zoom vendo a carta ao vivo.</p>
        <PhotoEditor playerId={id} photoX={player.photoX} photoY={player.photoY} photoZoom={player.photoZoom}
          card={{ nickname: player.nickname, position: player.primaryPosition, shirtNumber: player.shirtNumber, avatarUrl: player.avatarUrl,
            ovr: c?.ovr.value ?? player.overall ?? null, ovrSource: c?.ovr.source ?? null, attributes: c?.attributes ?? { FIN: null, DEC: null, DEF: null, CRI: null, PAS: null, REG: null } }} />
      </section>
      <PlayerForm action={updatePlayerAction.bind(null, id)} initial={player} users={users} cancelHref={`/app/elenco/${id}`} />
    </>
  );
}
