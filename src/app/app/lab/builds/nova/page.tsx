import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requirePage } from "@/server/auth/session";
import { labSubject, latestArchetypeId } from "@/server/services/lab";
import { saveBuildAction } from "@/server/actions/lab";
import { BuildEditor } from "@/components/lab/build-editor";
import { isTopic, TOPICS } from "@/lib/lab/trainer";
import { editorCostTables } from "@/server/services/cost-tables";

export const metadata: Metadata = { title: "Nova build · Performance Lab" };

export default async function NewBuild({ searchParams }: { searchParams: Promise<{ foco?: string; v?: string }> }) {
  const ctx = await requirePage("dashboard.view");
  const subj = await labSubject(ctx, null);
  if (subj.kind !== "player" || !subj.own) redirect("/app/lab/builds");
  const sp = await searchParams;
  const focus = isTopic(sp.foco) ? `${sp.foco}:${sp.v && TOPICS[sp.foco].variants[sp.v] ? sp.v : Object.keys(TOPICS[sp.foco].variants)[0]}` : null;
  const [archetypeId, tables] = await Promise.all([latestArchetypeId(subj.player.id), editorCostTables({ includeDrafts: ctx.permissions.has("gamedata.manage") })]);
  return (
    <div>
      <h2 className="mb-4 font-display text-2xl font-bold text-ink-100">{focus ? `Melhorar minha build — ${TOPICS[sp.foco as keyof typeof TOPICS].short}` : "Nova build"}</h2>
      <BuildEditor action={saveBuildAction.bind(null, null)} defaultPosition={subj.player.primaryPosition} archetypeIdHint={archetypeId} autoGenerate={!!focus} tables={tables}
        initial={{ name: "", archetype: null, level: null, position: subj.player.primaryPosition, role: null, heightCm: null, weightKg: null, pointsAvailable: null,
          specializations: null, notes: null, brief: null, focusTopic: focus, isPrimary: false, attributes: {}, playstyles: [], costTableId: null, purchases: {} }} />
    </div>
  );
}
