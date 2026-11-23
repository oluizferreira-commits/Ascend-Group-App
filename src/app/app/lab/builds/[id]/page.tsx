import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarCheck, GitCompareArrows, Star, Trash2 } from "lucide-react";
import { requirePage } from "@/server/auth/session";
import { getBuild, labMatches, labSubject, latestArchetypeId } from "@/server/services/lab";
import { deleteBuildAction, saveBuildAction, setPrimaryBuildAction, startUsingBuildAction } from "@/server/actions/lab";
import { BuildEditor } from "@/components/lab/build-editor";
import { StartUsingForm } from "@/components/lab/start-using-form";
import { SubjectBar } from "@/components/lab/subject";
import { Panel } from "@/components/ui/kit";
import { ConfirmSubmit } from "@/components/ui/confirm-button";
import { positionGroup } from "@/lib/domain";
import { fmtMetric, metricsFor } from "@/lib/lab/metrics";
import { comparePeriods, splitAt } from "@/lib/lab/progress";
import { cn } from "@/lib/cn";
import { editorCostTables, getCostTable, latestRevisionFor } from "@/server/services/cost-tables";

export const metadata: Metadata = { title: "Build · Performance Lab" };

export default async function BuildPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ jogador?: string; salvo?: string }> }) {
  const ctx = await requirePage("dashboard.view");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const subj = await labSubject(ctx, sp.jogador);
  if (subj.kind !== "player") notFound();
  const { player, own } = subj;
  const q = own ? "" : `?jogador=${player.id}`;
  const build = await getBuild(player.id, id);
  if (!build) notFound();
  const [matches, archetypeId, tables, usedTable] = await Promise.all([
    labMatches(ctx.club.id, player.id), latestArchetypeId(player.id),
    editorCostTables({ includeDrafts: own && ctx.permissions.has("gamedata.manage"), keepId: build.costTableId }),
    build.costTableId ? getCostTable(build.costTableId) : Promise.resolve(null),
  ]);
  const newer = usedTable ? await latestRevisionFor(usedTable) : null;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const split = build.startedUsingOn ? splitAt(matches, build.startedUsingOn) : null;
  const rows = split ? comparePeriods(metricsFor(positionGroup(player.primaryPosition)), split.before.slice(-10), split.after) : [];

  return (
    <div className="space-y-5">
      <SubjectBar player={player} own={own} canPick={false} path="/app/lab/builds" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link href={`/app/lab/builds${q}`} className="inline-flex items-center gap-1 text-sm text-ink-400 hover:text-ink-200"><ArrowLeft className="size-4" />Builds</Link>
        <div className="flex flex-wrap gap-2">
          <Link href={`/app/lab/builds/comparar${q ? q + "&" : "?"}a=${build.id}`} className="btn-secondary"><GitCompareArrows className="size-4" />Comparar</Link>
          {own && !build.isPrimary && <form action={setPrimaryBuildAction.bind(null, build.id)}><button className="btn-secondary"><Star className="size-4" />Tornar principal</button></form>}
          {own && <form action={deleteBuildAction.bind(null, build.id)}><ConfirmSubmit className="btn-danger" message={`Excluir a build “${build.name}”?`}><Trash2 className="size-4" />Excluir</ConfirmSubmit></form>}
        </div>
      </div>
      <h2 className="flex flex-wrap items-center gap-2 font-display text-2xl font-bold text-ink-100">
        {build.name}
        {build.isPrimary && <span className="inline-flex items-center gap-1 rounded-full bg-accent-500/15 px-2 py-0.5 font-sans text-xs font-semibold text-accent-400"><Star className="size-3" />Principal</span>}
      </h2>
      {usedTable && (
        <p className="text-xs text-ink-400">
          Calculada com a tabela <b className="text-ink-200">{usedTable.archetype} · {usedTable.season} · rev. {usedTable.revision}</b> ({usedTable.status === "verified" ? "verificada" : usedTable.status === "archived" ? "arquivada" : "rascunho"})
          {build.validation && <> · {build.validation.spent} AP{build.validation.budget != null ? ` de ${build.validation.budget}` : ""} · {build.validation.validated ? <span className="text-win">validada</span> : <span className="text-amber-500">não validada</span>}</>}
          {newer && newer.revision > usedTable.revision && <span className="text-amber-500"> · existe a rev. {newer.revision} verificada; esta build continua com os números da rev. {usedTable.revision}.</span>}
        </p>
      )}
      {sp.salvo === "1" && <p role="status" className="rounded-lg border border-win/40 bg-win/10 px-3 py-2 text-sm text-win">Build salva.</p>}

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Em uso" icon={CalendarCheck}>
          {build.startedUsingOn ? <p className="mb-3 text-sm text-ink-200">Em uso desde <b>{build.startedUsingOn.split("-").reverse().join("/")}</b>.</p> : <p className="mb-3 text-sm text-ink-400">Informe quando começou a usar esta build para o Lab comparar suas partidas antes e depois.</p>}
          {own && <StartUsingForm action={startUsingBuildAction.bind(null, build.id)} defaultDay={build.startedUsingOn ?? today} maxDay={today} />}
        </Panel>
        {split && (
          <Panel title="Antes × depois" icon={GitCompareArrows} bodyClassName="p-2 sm:p-3">
            <p className="px-2 pb-2 text-xs text-ink-400">Até 10 partidas antes ({split.before.slice(-10).length}) × {split.after.length} partida(s) depois. Resultados dependem também de adversários, função e companheiros — não atribua a mudança só à build.</p>
            <table className="data-table">
              <thead><tr><th>Indicador</th><th className="text-right">Antes</th><th className="text-right">Depois</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.def.key}>
                    <td className="whitespace-normal">{r.def.label}</td>
                    <td className="text-right tabular-nums">{fmtMetric(r.def, r.a)}</td>
                    <td className={cn("text-right font-semibold tabular-nums", r.better === true ? "text-win" : r.better === false ? "text-amber-500" : "")}>{fmtMetric(r.def, r.b)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {split.after.length < 3 && <p className="px-2 pt-2 text-xs text-ink-400">Ainda poucas partidas depois da mudança — aguarde ao menos 3 para tirar conclusões.</p>}
          </Panel>
        )}
      </div>

      <BuildEditor action={own ? saveBuildAction.bind(null, build.id) : undefined} readOnly={!own} defaultPosition={player.primaryPosition} archetypeIdHint={archetypeId}
        initial={{ name: build.name, archetype: build.archetype, level: build.level, position: build.position, role: build.role, heightCm: build.heightCm, weightKg: build.weightKg,
          pointsAvailable: build.pointsAvailable, specializations: build.specializations, notes: build.notes, brief: build.brief, focusTopic: build.focusTopic,
          isPrimary: build.isPrimary, attributes: build.attributes, playstyles: build.playstyles, costTableId: build.costTableId, purchases: build.purchases }} tables={tables} />
    </div>
  );
}
