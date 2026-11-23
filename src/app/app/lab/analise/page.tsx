import type { Metadata } from "next";
import { BarChart3, Ban, Bell, Users } from "lucide-react";
import { requirePage } from "@/server/auth/session";
import { labAnalysis, labSubject, listLabPlayers } from "@/server/services/lab";
import { InsightCard, MetricCell, OriginTag, SourceNote } from "@/components/lab/ui";
import { LabGate, SubjectBar } from "@/components/lab/subject";
import { Panel } from "@/components/ui/kit";
import { POSITION_GROUP_LABELS } from "@/lib/domain";
import { fmtMetric, METRIC_GROUPS, UNAVAILABLE, WINDOW_LABELS, type MetricGroup } from "@/lib/lab/metrics";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Análise · Performance Lab" };

export default async function LabAnalysis({ searchParams }: { searchParams: Promise<{ jogador?: string }> }) {
  const ctx = await requirePage("dashboard.view");
  const subj = await labSubject(ctx, (await searchParams).jogador);
  if (subj.kind !== "player") return <LabGate subj={subj} path="/app/lab/analise" />;
  const { player, own } = subj;
  const q = own ? "" : `?jogador=${player.id}`;
  const [a, players] = await Promise.all([labAnalysis(ctx.club.id, player), subj.canPick ? listLabPlayers(ctx.club.id) : Promise.resolve(undefined)]);
  const groups = [...new Set(a.table.map((r) => r.def.group))] as MetricGroup[];
  const peerOf = new Map(a.peer.map((p) => [p.def.key, p]));

  return (
    <div className="space-y-5">
      <SubjectBar player={player} own={own} canPick={subj.canPick} players={players} path="/app/lab/analise" />

      <section aria-labelledby="alertas">
        <h2 id="alertas" className="kicker mb-2 flex items-center gap-1.5"><Bell className="size-3.5 text-accent-400" />Alertas do analista · {a.insights.length}</h2>
        <div className="grid gap-3 lg:grid-cols-2">{a.insights.map((i) => <InsightCard key={i.id} i={i} q={q} canAct={own} />)}</div>
        <div className="mt-2"><SourceNote sources={a.sources} period={a.period}><span>Método: últimas 5 partidas contra todas as anteriores, considerando a variação normal do jogador.</span></SourceNote></div>
      </section>

      <Panel title="Indicadores por período" icon={BarChart3} bodyClassName="p-0">
        <p className="px-4 pt-3 text-xs text-ink-400 sm:px-5">Indicadores relevantes para {POSITION_GROUP_LABELS[a.group].toLowerCase()}. “Por jogo” equivale a por 90 minutos nas partidas da EA. “—” = dados insuficientes no período.</p>
        <div className="overflow-x-auto px-2 pb-2 sm:px-3">
          <table className="data-table min-w-[560px]">
            <thead>
              <tr>
                <th>Indicador</th>
                {(["last1", "last5", "last10", "career"] as const).map((w) => <th key={w} className="text-right">{WINDOW_LABELS[w]}</th>)}
                <th className="text-right">Mesma posição</th>
              </tr>
            </thead>
            {groups.map((g) => (
              <tbody key={g}>
                <tr><td colSpan={6} className="pt-4 font-display text-xs font-bold tracking-[0.14em] text-accent-400 uppercase">{METRIC_GROUPS[g]}</td></tr>
                {a.table.filter((r) => r.def.group === g).map((r) => {
                  const p = peerOf.get(r.def.key);
                  return (
                    <tr key={r.def.key}>
                      <td className="whitespace-normal"><span className="font-medium text-ink-100">{r.def.label}</span> <span className="hidden sm:inline"><OriginTag origin={r.def.origin} /></span><span className="block text-[11px] text-ink-500">{r.def.unit === "/jogo" ? "por jogo" : r.def.unit === "%" ? "percentual" : "0 a 10"}{r.def.better === "down" ? " · menor é melhor" : ""}</span></td>
                      <td><MetricCell def={r.def} v={r.last1} /></td>
                      <td><MetricCell def={r.def} v={r.last5} /></td>
                      <td><MetricCell def={r.def} v={r.last10} strong /></td>
                      <td><MetricCell def={r.def} v={r.career} /></td>
                      <td className="text-right">
                        {p?.avg != null ? (
                          <span className="block">
                            <span className="font-display text-base font-semibold tabular-nums">{fmtMetric(r.def, p.avg)}</span>
                            <span className={cn("block text-[10px]", p.position === "acima" ? "text-win" : p.position === "abaixo" ? "text-amber-500" : "text-ink-400")}>você: {p.position}</span>
                          </span>
                        ) : <span className="text-[11px] text-ink-500">amostra pequena</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            ))}
          </table>
        </div>
        <p className="flex items-center gap-1.5 border-t px-4 py-3 text-[11px] text-ink-400 hairline sm:px-5"><Users className="size-3.5" />
          {a.peersWithData >= 3 ? `Comparação com ${a.peersWithData} companheiros da mesma função (${POSITION_GROUP_LABELS[a.group].toLowerCase()}), sem expor os números de ninguém.` : "Comparação por posição aparece quando houver pelo menos 3 companheiros da mesma função com dados."}
        </p>
      </Panel>

      <Panel title="Dados indisponíveis" icon={Ban}>
        <p className="mb-3 text-sm text-ink-300">Estas métricas não são publicadas pela EA para Clubs. O Lab não as estima.</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {UNAVAILABLE.map((u) => (
            <li key={u.key} className="tile px-3 py-2.5">
              <p className="text-sm font-semibold text-ink-200">{u.label}</p>
              <p className="text-xs text-ink-400">{u.why}</p>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}
