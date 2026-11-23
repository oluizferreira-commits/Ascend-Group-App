import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Award, ClipboardList, Hammer, Sparkles, Target } from "lucide-react";
import { requirePage } from "@/server/auth/session";
import { labAnalysis, labSubject, listBuilds, listLabPlayers, listPlans } from "@/server/services/lab";
import { InsightCard, LabLink, SourceNote } from "@/components/lab/ui";
import { LabGate, SubjectBar } from "@/components/lab/subject";
import { Panel } from "@/components/ui/kit";
import { POSITION_NAMES } from "@/lib/domain";
import { fmtMetric } from "@/lib/lab/metrics";
import { TOPICS, isTopic } from "@/lib/lab/trainer";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Performance Lab" };

const dateFmt = (d: Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit" }).format(d);

export default async function LabOverview({ searchParams }: { searchParams: Promise<{ jogador?: string }> }) {
  const ctx = await requirePage("dashboard.view");
  const subj = await labSubject(ctx, (await searchParams).jogador);
  if (subj.kind !== "player") return <LabGate subj={subj} path="/app/lab" />;
  const { player, own } = subj;
  const q = own ? "" : `?jogador=${player.id}`;
  const [a, builds, plans, players] = await Promise.all([
    labAnalysis(ctx.club.id, player), listBuilds(player.id), listPlans(player.id), subj.canPick ? listLabPlayers(ctx.club.id) : Promise.resolve(undefined),
  ]);
  const main = a.insights[0];
  const primary = builds.find((b) => b.isPrimary);
  const active = plans.filter((p) => p.status === "active");
  const totals = a.matches.reduce((t, m) => ({ g: t.g + m.s.goals, a: t.a + m.s.assists }), { g: 0, a: 0 });
  const summary = a.table.filter((r) => ["rating", "passAccuracy", "involvements", "conversion", "tackleSuccess", "tackles", "savePct", "saves", "shots"].includes(r.def.key)).slice(0, 4);

  return (
    <div className="space-y-5">
      <SubjectBar player={player} own={own} canPick={subj.canPick} players={players} path="/app/lab" />

      <section aria-label="Diagnóstico principal">
        <p className="kicker mb-2 flex items-center gap-1.5"><Sparkles className="size-3.5 text-accent-400" />Diagnóstico principal</p>
        <InsightCard i={main} q={q} canAct={own} />
        <div className="mt-2"><SourceNote sources={a.sources} period={a.period} /></div>
      </section>

      <Panel title="Resumo de desempenho" icon={Target} link={{ href: `/app/lab/analise${q}`, label: "Análise completa" }}>
        <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["Posição", POSITION_NAMES[player.primaryPosition]],
            ["Partidas", a.matches.length],
            ["Gols", totals.g],
            ["Assistências", totals.a],
          ].map(([k, v]) => (
            <div key={k as string} className="tile px-2.5 py-2">
              <dt className="kicker text-[10px]">{k}</dt>
              <dd className="truncate font-display text-lg font-bold text-ink-100">{v}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {summary.map((r) => {
            const now = r.last10.value, base = r.career.value;
            const diff = now != null && base != null && a.matches.length > 10 ? now - base : null;
            const good = diff == null || Math.abs(diff) < 1e-9 ? null : (r.def.better === "up") === diff > 0;
            return (
              <div key={r.def.key} className="tile flex items-center justify-between gap-3 px-3 py-2.5">
                <span className="min-w-0">
                  <span className="block truncate text-sm text-ink-300">{r.def.label}</span>
                  <span className="text-[11px] text-ink-500">Últimas 10 · {r.last10.n} j. com dados</span>
                </span>
                <span className="text-right">
                  <span className={cn("block font-display text-2xl font-bold tabular-nums", now == null ? "text-ink-500" : "text-ink-100")}>{fmtMetric(r.def, now)}</span>
                  {diff != null && (
                    <span className={cn("text-[11px] tabular-nums", good ? "text-win" : good === false ? "text-amber-500" : "text-ink-400")}>
                      {diff > 0 ? "▲" : "▼"} {fmtMetric(r.def, Math.abs(diff))} vs histórico
                    </span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
        {a.matches.length > 0 && a.matches.length <= 10 && <p className="mt-2 text-[11px] text-ink-400">A comparação com o histórico aparece a partir de 11 partidas.</p>}
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Prioridades de desenvolvimento" icon={ClipboardList} link={{ href: `/app/lab/treinador${q}`, label: "Treinador" }}>
          {a.priorities.length === 0 ? (
            <p className="text-sm text-ink-400">Nenhum ponto de atenção identificado com confiança suficiente. Escolha um objetivo no Treinador para evoluir algo específico.</p>
          ) : (
            <ol className="space-y-2">
              {a.priorities.map((p, i) => (
                <li key={p.topic}>
                  <Link href={`/app/lab/treinador/${p.topic}${q ? q + "&" : "?"}${p.variant ? `v=${p.variant}&` : ""}origem=insight`} className="tile flex items-center gap-3 px-3 py-2.5 transition-colors hover:border-[var(--line-strong)]">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent-500/15 font-display text-sm font-bold text-accent-400">{i + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-semibold text-ink-100">{TOPICS[p.topic].label.replace(/^Quero /, "").replace(/^./, (c) => c.toUpperCase())}</span>
                      <span className="block truncate text-xs text-ink-400">{p.title}</span>
                    </span>
                    <ArrowRight className="size-4 shrink-0 text-ink-400" />
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        <Panel title="Em andamento" icon={Hammer}>
          <div className="space-y-3">
            <div>
              <p className="kicker mb-1">Planos ativos</p>
              {active.length === 0 ? <p className="text-sm text-ink-400">Nenhum plano ativo.</p> : (
                <ul className="space-y-1.5">
                  {active.slice(0, 3).map((p) => {
                    const done = p.goals.filter((g) => g.done).length;
                    return (
                      <li key={p.id} className="flex items-center gap-3 text-sm">
                        <Link href={`/app/lab/treinador/${p.topic}${q ? q + "&" : "?"}v=${p.variant ?? ""}`} className="min-w-0 flex-1 truncate font-medium hover:text-accent-400">{isTopic(p.topic) ? TOPICS[p.topic].short : p.topic}</Link>
                        <span className="text-xs text-ink-400 tabular-nums">{done}/{p.goals.length} objetivos</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            <div className="border-t pt-3 hairline">
              <p className="kicker mb-1">Build principal</p>
              {primary ? (
                <Link href={`/app/lab/builds/${primary.id}${q}`} className="flex items-center justify-between gap-2 text-sm hover:text-accent-400">
                  <span className="truncate font-medium">{primary.name}{primary.archetype ? ` · ${primary.archetype}` : ""}</span>
                  <span className="shrink-0 text-xs text-ink-400">{primary.startedUsingOn ? `em uso desde ${primary.startedUsingOn.split("-").reverse().slice(0, 2).join("/")}` : "não marcada como em uso"}</span>
                </Link>
              ) : <p className="text-sm text-ink-400">Nenhuma build salva. {own && <LabLink href="/app/lab/builds/nova">Criar build</LabLink>}</p>}
            </div>
          </div>
        </Panel>
      </div>

      {a.achievements.length > 0 && (
        <Panel title="Conquistas recentes" icon={Award}>
          <ul className="grid gap-2 sm:grid-cols-2">
            {a.achievements.map((x) => (
              <li key={x.id} className="tile flex items-start gap-3 px-3 py-2.5">
                <Award className="mt-0.5 size-4 shrink-0 text-accent-400" />
                <span className="min-w-0"><span className="block text-sm font-semibold text-ink-100">{x.title}</span><span className="block text-xs text-ink-400">{x.detail} · {dateFmt(x.at)}</span></span>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
