import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Hammer, Lightbulb, ListChecks, Sparkles, Star, Target } from "lucide-react";
import { requirePage } from "@/server/auth/session";
import { baselineFor, labMatches, labSubject, listLabPlayers, listPlans } from "@/server/services/lab";
import { createPlanAction } from "@/server/actions/lab";
import { LabGate, SubjectBar } from "@/components/lab/subject";
import { TopicIcon } from "@/components/lab/topic-icon";
import { PlanCard } from "@/components/lab/plan-card";
import { Panel } from "@/components/ui/kit";
import { SubmitButton } from "@/components/ui/form";
import { ATTR_LABEL, PLAYSTYLE_BY_KEY, PLAYSTYLES_VERIFIED } from "@/lib/lab/game-data";
import { fmtMetric, METRIC_BY_KEY } from "@/lib/lab/metrics";
import { goalTarget } from "@/lib/lab/progress";
import { isTopic, topicVariant } from "@/lib/lab/trainer";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Treinador · Performance Lab" };

export default async function TopicPage({ params, searchParams }: { params: Promise<{ topic: string }>; searchParams: Promise<{ jogador?: string; v?: string; origem?: string; plano?: string }> }) {
  const ctx = await requirePage("dashboard.view");
  const [{ topic }, sp] = await Promise.all([params, searchParams]);
  if (!isTopic(topic)) notFound();
  const subj = await labSubject(ctx, sp.jogador);
  if (subj.kind !== "player") return <LabGate subj={subj} path={`/app/lab/treinador/${topic}`} />;
  const { player, own } = subj;
  const q = own ? "" : `?jogador=${player.id}`;
  const amp = q ? q + "&" : "?";
  const { topic: t, variantKey, variant: v } = topicVariant(topic, sp.v);
  const [matches, plans, players] = await Promise.all([labMatches(ctx.club.id, player.id), listPlans(player.id), subj.canPick ? listLabPlayers(ctx.club.id) : Promise.resolve(undefined)]);
  const baseline = baselineFor(matches);
  const current = plans.find((p) => p.topic === topic && p.status === "active");
  const origin = sp.origem === "insight" ? "insight" : "trainer";

  return (
    <div className="space-y-5">
      <SubjectBar player={player} own={own} canPick={subj.canPick} players={players} path={`/app/lab/treinador/${topic}`} />
      <Link href={`/app/lab/treinador${q}`} className="inline-flex items-center gap-1 text-sm text-ink-400 hover:text-ink-200"><ArrowLeft className="size-4" />Todos os temas</Link>

      <header className="flex items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-xl border hairline bg-accent-500/10 text-accent-400"><TopicIcon icon={t.icon} className="size-6" /></span>
        <h2 className="font-display text-2xl leading-tight font-bold text-ink-100 sm:text-3xl">{t.label}</h2>
      </header>
      {sp.plano === "1" && <p role="status" className="rounded-lg border border-win/40 bg-win/10 px-3 py-2 text-sm text-win">Plano salvo. Ele acompanha suas próximas partidas automaticamente.</p>}

      <section aria-labelledby="pergunta">
        <h3 id="pergunta" className="kicker mb-2">{t.question}</h3>
        <div className="flex flex-wrap gap-2" role="radiogroup">
          {Object.entries(t.variants).map(([k, x]) => (
            <Link key={k} role="radio" aria-checked={k === variantKey} href={`/app/lab/treinador/${topic}${amp}v=${k}${origin === "insight" ? "&origem=insight" : ""}`} scroll={false}
              className={cn("rounded-full border px-3.5 py-2 text-sm font-medium transition-colors", k === variantKey ? "border-accent-500 bg-accent-500/15 text-ink-100" : "hairline text-ink-300 hover:border-[var(--line-strong)]")}>
              {x.label}
            </Link>
          ))}
        </div>
      </section>

      <Panel title="Diagnóstico" icon={Sparkles}>
        <p className="text-sm leading-relaxed text-ink-200">{v.explanation}</p>
        {t.metrics.length > 0 && (
          <div className="mt-4">
            <p className="kicker mb-2">Seus números (últimas 10 partidas)</p>
            <div className="flex flex-wrap gap-2">
              {t.metrics.map((k) => METRIC_BY_KEY[k]).filter(Boolean).map((d) => (
                <span key={d.key} className="tile px-3 py-1.5 text-sm"><span className="text-ink-400">{d.short}: </span><b className="font-display text-base text-ink-100">{fmtMetric(d, baseline[d.key] ?? null)}</b></span>
              ))}
            </div>
          </div>
        )}
        {t.metrics.length === 0 && <p className="mt-3 text-xs text-ink-400">A EA não publica estatísticas deste fundamento — as metas aqui são de autoavaliação.</p>}
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Atributos" icon={Star}>
          <p className="kicker mb-1.5">Prioritários</p>
          <ul className="mb-3 flex flex-wrap gap-1.5">{v.primary.map((a) => <li key={a} className="rounded-lg border border-accent-500/50 bg-accent-500/10 px-2.5 py-1 text-sm font-semibold text-ink-100">{ATTR_LABEL[a]}</li>)}</ul>
          <p className="kicker mb-1.5">Complementares</p>
          <ul className="flex flex-wrap gap-1.5">{v.complementary.map((a) => <li key={a} className="tile px-2.5 py-1 text-sm text-ink-200">{ATTR_LABEL[a]}</li>)}</ul>
          <p className="kicker mt-4 mb-1.5">Estilos de jogo recomendados</p>
          <ul className="flex flex-wrap gap-1.5">{v.playstyles.map((p) => <li key={p} className="tile px-2.5 py-1 text-sm text-ink-200">{PLAYSTYLE_BY_KEY[p].label} <span className="text-[11px] text-ink-500">({PLAYSTYLE_BY_KEY[p].en})</span></li>)}</ul>
          <p className="mt-2 text-[11px] text-ink-500">{PLAYSTYLES_VERIFIED.note}</p>
        </Panel>
        <Panel title="Dicas de execução" icon={Lightbulb}>
          <ul className="space-y-2">{v.tips.map((tip) => <li key={tip} className="flex gap-2 text-sm text-ink-200"><span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent-400" />{tip}</li>)}</ul>
        </Panel>
      </div>

      <Panel title="Objetivos mensuráveis" icon={Target}>
        <ul className="space-y-2">
          {v.goals.map((g) => {
            const def = g.metric ? METRIC_BY_KEY[g.metric] : null;
            const base = g.metric ? baseline[g.metric] ?? null : null;
            const target = g.metric && g.direction && g.delta != null ? goalTarget(g.metric, base, g.direction, g.delta) : null;
            return (
              <li key={g.text} className="tile flex items-start gap-3 px-3 py-2.5">
                <ListChecks className="mt-0.5 size-4 shrink-0 text-accent-400" />
                <span className="min-w-0 text-sm">
                  <span className="block text-ink-100">{g.text}</span>
                  <span className="block text-xs text-ink-400">
                    {def ? (base != null ? `Hoje: ${fmtMetric(def, base)} → meta ${fmtMetric(def, target)} (acompanhado automaticamente)` : "Meta medida pelos dados quando houver partidas suficientes.") : "Autoavaliação — a EA não publica este dado."}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
        <div className="mt-4 flex flex-wrap gap-2 border-t pt-4 hairline">
          {own ? (
            <>
              <form action={createPlanAction.bind(null, topic, variantKey, origin)}>
                <SubmitButton pendingText="Salvando…">{current ? "Recomeçar o plano com esta opção" : "Salvar plano"}</SubmitButton>
              </form>
              <Link href={`/app/lab/builds/nova?foco=${topic}&v=${variantKey}`} className="btn-secondary"><Hammer className="size-4" />Melhorar minha build</Link>
            </>
          ) : <p className="text-sm text-ink-400">Somente o jogador pode salvar planos e builds.</p>}
        </div>
      </Panel>

      {current && (
        <section aria-labelledby="atual">
          <h3 id="atual" className="kicker mb-2">Seu plano atual</h3>
          <PlanCard plan={current} matches={matches} canEdit={own} q={q} showTopic />
        </section>
      )}
    </div>
  );
}
