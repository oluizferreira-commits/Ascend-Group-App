import type { Metadata } from "next";
import { requirePage } from "@/server/auth/session";
import { linkableUsers } from "@/server/services/players";
import { createPlayerAction } from "@/server/actions/players";
import { PageHeader } from "@/components/ui/basics";
import { PlayerForm } from "@/components/players/player-form";

export const metadata: Metadata = { title: "Novo jogador" };

export default async function NewPlayerPage() {
  const ctx = await requirePage("players.manage");
  const users = await linkableUsers(ctx.club.id);
  return (
    <>
      <PageHeader eyebrow="Elenco" title="Novo jogador" />
      <PlayerForm action={createPlayerAction} users={users} cancelHref="/app/elenco" />
    </>
  );
}
