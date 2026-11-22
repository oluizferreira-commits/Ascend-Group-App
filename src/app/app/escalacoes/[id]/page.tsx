import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ImageDown, Trash2 } from "lucide-react";
import { requirePage } from "@/server/auth/session";
import { getLineup } from "@/server/services/lineups";
import { lineupEditorData } from "@/server/services/lineup-data";
import { deleteLineupAction, saveLineupAction } from "@/server/actions/lineups";
import { PageHeader } from "@/components/ui/basics";
import { ConfirmSubmit } from "@/components/ui/confirm-button";
import { LineupEditor } from "@/components/lineups/editor";

export const metadata: Metadata = { title: "Escalação" };

export default async function LineupPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePage("lineups.view");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const lineup = await getLineup(ctx.club.id, id);
  if (!lineup) notFound();
  const data = await lineupEditorData(ctx.club.id);
  const canEdit = ctx.permissions.has("lineups.manage");
  const slots = Object.fromEntries(lineup.players.filter((p) => p.slotKey).map((p) => [p.slotKey!, p.playerId]));
  const bench = lineup.players.filter((p) => !p.slotKey).sort((a, b) => (a.benchOrder ?? 0) - (b.benchOrder ?? 0)).map((p) => p.playerId);
  return (
    <>
      <PageHeader eyebrow="Escalações" title={lineup.name} actions={<>
        {ctx.permissions.has("media.manage") && <Link href={`/app/midia?template=lineup&lineup=${id}`} className="btn-secondary"><ImageDown className="size-4" />Gerar arte</Link>}
        {canEdit && <form action={deleteLineupAction.bind(null, id)}><ConfirmSubmit className="btn-danger" message="Excluir esta escalação?"><Trash2 className="size-4" />Excluir</ConfirmSubmit></form>}
      </>} />
      <LineupEditor action={saveLineupAction.bind(null, id)} {...data} readOnly={!canEdit}
        initial={{ ...lineup, matchId: lineup.matchId ?? "", slots, bench }} />
    </>
  );
}
