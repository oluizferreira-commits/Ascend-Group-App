import type { Metadata } from "next";
import { requirePage } from "@/server/auth/session";
import { lineupEditorData } from "@/server/services/lineup-data";
import { saveLineupAction } from "@/server/actions/lineups";
import { PageHeader } from "@/components/ui/basics";
import { LineupEditor } from "@/components/lineups/editor";

export const metadata: Metadata = { title: "Nova escalação" };

export default async function NewLineupPage() {
  const ctx = await requirePage("lineups.manage");
  const data = await lineupEditorData(ctx.club.id);
  return (
    <>
      <PageHeader eyebrow="Escalações" title="Nova escalação" />
      <LineupEditor action={saveLineupAction.bind(null, null)} {...data} />
    </>
  );
}
