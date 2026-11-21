import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePage } from "@/server/auth/session";
import { getPlayer, linkableUsers } from "@/server/services/players";
import { updatePlayerAction } from "@/server/actions/players";
import { PageHeader } from "@/components/ui/basics";
import { PlayerForm } from "@/components/players/player-form";

export const metadata: Metadata = { title: "Editar jogador" };

export default async function EditPlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePage("players.manage");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const player = await getPlayer(ctx.club.id, id);
  if (!player) notFound();
  const users = await linkableUsers(ctx.club.id, id);
  return (
    <>
      <PageHeader eyebrow="Elenco" title={`Editar ${player.nickname}`} />
      <PlayerForm action={updatePlayerAction.bind(null, id)} initial={player} users={users} cancelHref={`/app/elenco/${id}`} />
    </>
  );
}
