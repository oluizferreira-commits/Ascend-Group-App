import type { Metadata } from "next";
import Link from "next/link";
import { Award, CalendarRange, GitCompareArrows, History, LineChart as ChartIcon } from "lucide-react";
import { requirePage } from "@/server/auth/session";
import { labAnalysis, labSubject, listBuilds, listEvents, listLabPlayers } from "@/server/services/lab";
import { getPlayerSeasonHistory } from "@/server/services/stats";
import { LabGate, SubjectBar } from "@/components/lab/subject";
import { LineChart } from "@/components/lab/ui";
import { Panel } from "@/components/ui/kit";
import { fmtMetric, METRIC_BY_KEY, metricsFor, rollingSeries } from "@/lib/lab/metrics";
import { comparePeriods, splitAt } from "@/lib/lab/progress";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Evolução · Performance Lab" };
const short = (d: Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" }).format(d);
const full = (d: Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "numeric" }).format(d);

export default async function Evolution({ searchParams }: { searchParams: Promise<{ jogador?: string; periodo?: string }> }) {
  const ctx = await requirePage("dashboard.view");
  const sp = await searchParams;
  const subj = await labSubject(ctx, sp.jogador);
  if (subj.kind !== "player") return <LabGate subj={subj} path="/app/lab/evolucao" />;
  const { player, own } = subj;
  const q = own ? "" : `jogador=${player.id}&`;
  const [a, builds, events, seasons, players] = await Promise.all([
    labAnalysis(ctx.club.id, player), listBuilds(player.id), listEvents(player.id, 40), getPlayerSeasonHistory(ctx.club.id, player.id),
    subj.canPick ? listLabPlayers(ctx.club.id) : Promise.resolve(undefined),
  ]);
  const m = a.matches;
  const primary = builds.find((b) => b.isPrimary && b.startedUsingOn);

  const presets = [
    { key: "5", label: "Últimas 5 × 5 anteriores" },
    { key: "10", label: "Últimas 10 × 10 anteriores" },
    ...(primary ? [{ key: "build", label: `Antes × depois de “${primary.name}”` }] : []),
  ];
  const period = presets.some((p) => p.key === sp.periodo) ? sp.periodo! : "5";
  let A = m.slice(-10, -5), B = m.slice(-5), labelA = "5 anteriores", labelB = "Últimas 5";
  if (period === "10") { A = m.slice(-20, -10); B = m.slice(-10); labelA = "10 anteriores"; labelB = "Últimas 10"; }
  if (period === "build" && primary) { const s = splitAt(m, primary.startedUsingOn!); A = s.before.slice(-10); B = s.after; labelA = "Antes"; labelB = "Depois"; }
  const rows = comparePeriods(metricsFor(a.group), A, B);

  const chartKeys = ["rating", ...(a.group === "GK" ? ["savePct"] : ["involvements", "passAccuracy"]), ...(a.group === "DEF" || a.group === "MID" ? ["tackleSuccess"] : a.group === "ATT" ? ["conversion"] : [])];
  const charts = chartKeys.map((k) => METRIC_BY_KEY[k]).filter((d) => d.relevant.includes(a.group));
  const careerOf = new Map(a.table.map((r) => [r.def.key, r.career.value]));

  return (
    <div className="space-y-5">
      <SubjectBar player={player} own={own} canPick={subj.canPick} players={players} path="/app/lab/evolucao" />

      <Panel title="Gráficos de evolução" icon={ChartIcon}>
        {m.length < 3 ? <p className="text-sm text-ink-400">Os gráficos aparecem a partir de 3 partidas.</p> : (
          <div className="grid gap-6 lg:grid-cols-2">
            {charts.map((def) => {
              const series = def.key === "rating"
                ? m.map((x) => ({ value: x.rating, label: short(x.kickoffAt) }))
                : rollingSeries(def, m, 5).map((x) => ({ value: x.value, label: short(x.at) }));
              return (
                <div key={def.key}>
                  <p className="mb-1 text-sm font-semibold text-ink-100">{def.label} <span className="text-xs font-normal text-ink-400">{def.key === "rating" ? "por partida" : "média móvel de 5 partidas"}</span></p>
                  <LineChart points={series.slice(-30)} reference={careerOf.get(def.key) ?? null} format={(v) => fmtMetric(def, v)} label={`Evolução de ${def.label}`} />
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <Panel title="Comparar períodos" icon={GitCompareArrows} bodyClassName="p-2 sm:p-3">
        <div data-no-swipe className="mb-2 flex gap-1.5 overflow-x-auto px-2 pt-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {presets.map((p) => (
            <Link key={p.key} href={`/app/lab/evolucao?${q}periodo=${p.key}`} scroll={false}
              className={cn("shrink-0 rounded-full border px-3 py-1.5 text-sm", p.key === period ? "border-accent-500 bg-accent-500/15 text-ink-100" : "hairline text-ink-300")}>{p.label}</Link>
          ))}
        </div>
        {A.length === 0 || B.length === 0 ? <p className="p-3 text-sm text-ink-400">Ainda não há partidas suficientes nos dois períodos.</p> : (
          <table className="data-table">
            <thead><tr><th>Indicador</th><th className="text-right">{labelA} <span className="font-sans text-[10px] font-normal normal-case">({A.length})</span></th><th className="text-right">{labelB} <span className="font-sans text-[10px] font-normal normal-case">({B.length})</span></th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.def.key}>
                  <td className="whitespace-normal">{r.def.label}</td>
                  <td className="text-right tabular-nums">{fmtMetric(r.def, r.a)}</td>
                  <td className={cn("text-right font-semibold tabular-nums", r.better === true ? "text-win" : r.better === false ? "text-amber-500" : "")}>
                    {fmtMetric(r.def, r.b)}{r.diff != null && r.diff !== 0 && <span className="ml-1 text-[10px]">{r.diff > 0 ? "▲" : "▼"}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {period === "build" && <p className="px-2 pt-2 text-[11px] text-ink-400">A mudança de build é só um dos fatores — adversários, função e companheiros também influenciam.</p>}
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Conquistas" icon={Award}>
          {a.achievements.length === 0 ? <p className="text-sm text-ink-400">Nenhum recorde pessoal nas partidas mais recentes. As conquistas aparecem quando os dados mostram um recorde de verdade.</p> : (
            <ul className="space-y-2">{a.achievements.map((x) => <li key={x.id} className="tile px-3 py-2.5"><p className="text-sm font-semibold">{x.title}</p><p className="text-xs text-ink-400">{x.detail} · {full(x.at)}</p></li>)}</ul>
          )}
        </Panel>
        <Panel title="Por temporada" icon={CalendarRange} bodyClassName="p-2 sm:p-3">
          {seasons.length === 0 ? <p className="p-3 text-sm text-ink-400">Sem partidas registradas.</p> : (
            <table className="data-table">
              <thead><tr><th>Temporada</th><th className="text-right">J</th><th className="text-right">G</th><th className="text-right">A</th><th className="text-right">V-E-D</th></tr></thead>
              <tbody>{seasons.map((s) => <tr key={s.seasonId ?? "none"}><td>{s.seasonName}</td><td className="text-right">{s.matches}</td><td className="text-right">{s.goals}</td><td className="text-right">{s.assists}</td><td className="text-right text-ink-400">{s.wins}-{s.draws}-{s.losses}</td></tr>)}</tbody>
            </table>
          )}
        </Panel>
      </div>

      <Panel title="Histórico de desenvolvimento" icon={History}>
        {events.length === 0 ? <p className="text-sm text-ink-400">Builds salvas, planos e objetivos concluídos aparecem aqui.</p> : (
          <ol className="relative space-y-3 border-l pl-4 hairline">
            {events.map((e) => (
              <li key={e.id} className="relative">
                <span className="absolute top-1.5 -left-[21px] size-2.5 rounded-full border-2 border-[var(--surface-2)] bg-accent-500" />
                <p className="text-sm text-ink-100">{e.title}</p>
                <p className="text-xs text-ink-400">{full(e.createdAt)}</p>
              </li>
            ))}
          </ol>
        )}
      </Panel>
    </div>
  );
}
