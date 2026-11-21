import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requirePage } from "@/server/auth/session";
import { listSeasons } from "@/server/services/club";
import { getMatchDetail } from "@/server/services/matches";
import { listCompetitions, listFormations } from "@/server/services/reference";
import { updateMatchAction } from "@/server/actions/matches";
import { PageHeader } from "@/components/ui/basics";
import { MatchForm } from "@/components/matches/match-form";
import { toLocalInput } from "@/lib/format";

export const metadata: Metadata = { title: "Editar partida" };

export default async function EditMatchPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePage("matches.manage");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const detail = await getMatchDetail(ctx.club.id, id);
  if (!detail) notFound();
  const [seasons, competitions, formations] = await Promise.all([listSeasons(ctx.club.id), listCompetitions(ctx.club.id), listFormations(ctx.club.id)]);
  const m = detail.match;
  return (
    <>
      <PageHeader eyebrow="Partidas" title={`Editar · vs ${m.opponentName}`} />
      <MatchForm
        action={updateMatchAction.bind(null, id)}
        initial={{ ...m, kickoff: toLocalInput(m.kickoffAt) }}
        seasons={seasons} competitions={competitions} formations={formations} cancelHref={`/app/partidas/${id}`}
      />
    </>
  );
}
