import type { Metadata } from "next";
import { requirePage } from "@/server/auth/session";
import { getClubOverview, listSeasons } from "@/server/services/club";
import { listCompetitions, listFormations } from "@/server/services/reference";
import { createMatchAction } from "@/server/actions/matches";
import { PageHeader } from "@/components/ui/basics";
import { MatchForm } from "@/components/matches/match-form";

export const metadata: Metadata = { title: "Nova partida" };

export default async function NewMatchPage() {
  const ctx = await requirePage("matches.manage");
  const [overview, seasons, competitions, formations] = await Promise.all([
    getClubOverview(ctx.club.id), listSeasons(ctx.club.id), listCompetitions(ctx.club.id), listFormations(ctx.club.id),
  ]);
  return (
    <>
      <PageHeader eyebrow="Partidas" title="Nova partida" description="Agende uma partida ou registre um resultado. A súmula (jogadores e estatísticas) é preenchida em seguida." />
      <MatchForm action={createMatchAction} initial={{ seasonId: overview.currentSeason?.id }} seasons={seasons} competitions={competitions} formations={formations} cancelHref="/app/partidas" />
    </>
  );
}
