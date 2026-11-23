import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, Archive, ArrowLeft, CheckCircle2, CopyPlus, Download, Trash2, XCircle } from "lucide-react";
import { requirePage } from "@/server/auth/session";
import { getCostTable, latestRevisionFor, listCostTables } from "@/server/services/cost-tables";
import { archiveCostTableAction, deleteDraftAction, newRevisionAction, replaceDraftDataAction, verifyCostTableAction } from "@/server/actions/cost-tables";
import { ReplaceDraftForm, VerifyForm } from "@/components/admin/cost-table-forms";
import { PageHeader } from "@/components/ui/basics";
import { Panel } from "@/components/ui/kit";
import { ConfirmSubmit } from "@/components/ui/confirm-button";
import { validateTable } from "@/lib/lab/ap-engine";
import { ATTRIBUTES, ATTR_CATEGORIES, ATTR_LABEL, type AttrKey } from "@/lib/lab/game-data";
import { COST_TABLE_STATUS } from "@/lib/lab/cost-status";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Tabela de custos" };

export default async function CostTablePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ importada?: string; verificada?: string }> }) {
  await requirePage("gamedata.manage");
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const t = await getCostTable(id);
  if (!t) notFound();
  const [issues, latest, all] = [validateTable(t.data), await latestRevisionFor(t), await listCostTables()];
  const builds = all.find((x) => x.id === t.id)?.builds ?? 0;
  const errors = issues.filter((i) => i.level === "error"), warnings = issues.filter((i) => i.level === "warning");
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
  const levels = Object.entries(t.data.levelBudget ?? {}).map(([l, v]) => [Number(l), v] as const).sort((a, b) => a[0] - b[0]);
  const st = COST_TABLE_STATUS[t.status];

  return (
    <>
      <Link href="/app/admin/custos-builds" className="mb-3 inline-flex items-center gap-1 text-sm text-ink-400 hover:text-ink-200"><ArrowLeft className="size-4" />Tabelas</Link>
      <PageHeader eyebrow={`${t.gameVersion} · ${t.season}`} title={`${t.archetype} · rev. ${t.revision}`}
        actions={<>
          <a href={`data:application/json;charset=utf-8,${encodeURIComponent(JSON.stringify(t.data, null, 2))}`} download={`custos-${t.archetype}-rev${t.revision}.json`} className="btn-secondary"><Download className="size-4" />JSON</a>
          <form action={newRevisionAction.bind(null, t.id)}><button className="btn-secondary"><CopyPlus className="size-4" />Nova revisão</button></form>
          {t.status === "verified" && <form action={archiveCostTableAction.bind(null, t.id)}><ConfirmSubmit className="btn-secondary" message="Arquivar esta tabela? Builds já salvas continuam com ela, mas ela deixa de aparecer para novas builds."><Archive className="size-4" />Arquivar</ConfirmSubmit></form>}
          {t.status === "draft" && builds === 0 && <form action={deleteDraftAction.bind(null, t.id)}><ConfirmSubmit className="btn-danger" message="Excluir este rascunho?"><Trash2 className="size-4" />Excluir</ConfirmSubmit></form>}
        </>} />
      {sp.verificada === "1" && <p role="status" className="mb-4 rounded-lg border border-win/40 bg-win/10 px-3 py-2 text-sm text-win">Tabela verificada. Builds com esta tabela agora podem ser validadas.</p>}
      {sp.importada === "1" && <p role="status" className="mb-4 rounded-lg border border-win/40 bg-win/10 px-3 py-2 text-sm text-win">Tabela importada como rascunho. Revise e marque como verificada quando conferir com a fonte.</p>}

      <div className="mb-6 flex flex-wrap items-center gap-2 text-sm">
        <span className={cn("rounded-full border px-2.5 py-0.5 text-xs font-semibold", st?.cls)}>{st?.label}</span>
        <span className="text-ink-400">Fonte: {t.source ?? "—"}{t.sourceUrl && <> · <a href={t.sourceUrl} target="_blank" rel="noreferrer" className="text-accent-400 underline">link</a></>}</span>
        {t.verifiedOn && <span className="text-ink-400">· verificada em {t.verifiedOn.split("-").reverse().join("/")}</span>}
        <span className="text-ink-400">· {builds} build(s) usam esta revisão</span>
        {latest && latest.id !== t.id && latest.revision > t.revision && <Link href={`/app/admin/custos-builds/${latest.id}`} className="text-amber-500 underline">Existe revisão mais nova verificada (rev. {latest.revision})</Link>}
      </div>
      {t.notes && <p className="mb-4 text-sm text-ink-300">{t.notes}</p>}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <Panel title="Revisão automática" icon={errors.length ? XCircle : warnings.length ? AlertTriangle : CheckCircle2}>
            {issues.length === 0 ? <p className="text-sm text-win">Estrutura completa: todos os atributos, orçamento por nível e nenhuma inconsistência.</p> : (
              <ul className="space-y-1.5 text-sm">
                {issues.map((i, k) => <li key={k} className={cn("flex gap-2", i.level === "error" ? "text-loss" : "text-amber-500")}>{i.level === "error" ? <XCircle className="mt-0.5 size-4 shrink-0" /> : <AlertTriangle className="mt-0.5 size-4 shrink-0" />}{i.message}</li>)}
              </ul>
            )}
            <p className="mt-3 text-xs text-ink-400">Builds só são validadas com tabela <b>verificada</b>, sem erros, cobrindo todos os atributos e com o orçamento do nível do jogador.</p>
          </Panel>

          <Panel title="Atributos" bodyClassName="overflow-x-auto p-2 sm:p-3">
            <table className="data-table">
              <thead><tr><th>Atributo</th><th className="text-right">Base</th><th className="text-right">Máx.</th><th className="text-right">1º passo</th><th className="text-right">Último</th><th className="text-right">Base → máx.</th></tr></thead>
              {(Object.keys(ATTR_CATEGORIES) as (keyof typeof ATTR_CATEGORIES)[]).map((c) => (
                <tbody key={c}>
                  <tr><td colSpan={6} className="pt-4 font-display text-xs font-bold tracking-[0.14em] text-accent-400 uppercase">{ATTR_CATEGORIES[c]}</td></tr>
                  {ATTRIBUTES.filter((a) => a.cat === c).map((a) => {
                    const r = t.data.attrs[a.key as AttrKey];
                    return (
                      <tr key={a.key}>
                        <td>{a.label}</td>
                        {r ? (<>
                          <td className="text-right tabular-nums">{r.base}</td><td className="text-right tabular-nums">{r.max}</td>
                          <td className="text-right tabular-nums">{r.costs[0] ?? "—"}</td><td className="text-right tabular-nums">{r.costs.at(-1) ?? "—"}</td>
                          <td className="text-right font-semibold tabular-nums">{r.costs.reduce((s, x) => s + x, 0)}</td>
                        </>) : <td colSpan={5} className="text-right text-xs text-amber-500">sem regra</td>}
                      </tr>
                    );
                  })}
                </tbody>
              ))}
            </table>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Orçamento por nível" bodyClassName="max-h-80 overflow-y-auto p-2 sm:p-3">
            {levels.length === 0 ? <p className="p-2 text-sm text-amber-500">Sem valores — builds desta tabela não podem ter o total validado.</p> : (
              <table className="data-table"><thead><tr><th>Nível</th><th className="text-right">AP total</th></tr></thead>
                <tbody>{levels.map(([l, v]) => <tr key={l}><td>{l}</td><td className="text-right tabular-nums">{v}</td></tr>)}</tbody></table>
            )}
          </Panel>
          <Panel title="Modificadores">
            {[["Altura (cm)", t.data.modifiers?.heightCm], ["Peso (kg)", t.data.modifiers?.weightKg]].map(([label, bands]) => (
              <div key={label as string} className="mb-3">
                <p className="kicker mb-1">{label as string}</p>
                {!(bands as unknown[] | undefined)?.length ? <p className="text-sm text-ink-400">Nenhuma regra (não aplicado).</p> : (
                  <ul className="space-y-1 text-sm">{(bands as { min: number; max: number; deltas: Record<string, number> }[]).map((b, i) => <li key={i}>{b.min}–{b.max}: {Object.entries(b.deltas).map(([k, d]) => `${ATTR_LABEL[k as AttrKey] ?? k} ${d > 0 ? "+" : ""}${d}`).join(", ") || "sem efeito"}</li>)}</ul>
                )}
              </div>
            ))}
            <p className="kicker mb-1">Especializações</p>
            {!Object.keys(t.data.modifiers?.specializations ?? {}).length ? <p className="text-sm text-ink-400">Nenhuma regra (não aplicado).</p> : (
              <ul className="space-y-1 text-sm">{Object.entries(t.data.modifiers!.specializations!).map(([n, d]) => <li key={n}><b>{n}</b>: {Object.entries(d).map(([k, v]) => `${ATTR_LABEL[k as AttrKey] ?? k} ${v > 0 ? "+" : ""}${v}`).join(", ")}</li>)}</ul>
            )}
            <p className="mt-3 text-xs text-ink-400">Modificadores mudam apenas o valor exibido; não alteram níveis comprados nem custos.</p>
          </Panel>
          {t.status === "draft" && (
            <>
              <Panel title="Verificar"><VerifyForm action={verifyCostTableAction.bind(null, t.id)} source={t.source} sourceUrl={t.sourceUrl} today={today} hasWarnings={warnings.length > 0} /></Panel>
              <Panel title="Substituir dados"><ReplaceDraftForm action={replaceDraftDataAction.bind(null, t.id)} /></Panel>
            </>
          )}
        </div>
      </div>
    </>
  );
}
