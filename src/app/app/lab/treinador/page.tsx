import type { Metadata } from "next";
import Link from "next/link";
import { requirePage } from "@/server/auth/session";
import { labMatches, labSubject, listLabPlayers, listPlans } from "@/server/services/lab";
import { LabGate, SubjectBar } from "@/components/lab/subject";
import { TopicIcon } from "@/components/lab/topic-icon";
import { PlanCard } from "@/components/lab/plan-card";
import { TOPICS, TOPIC_KEYS } from "@/lib/lab/trainer";

export const metadata: Metadata = { title: "Treinador · Performance Lab" };

export default async function TrainerIndex({ searchParams }: { searchParams: Promise<{ jogador?: string }> }) {
  const ctx = await requirePage("dashboard.view");
  const subj = await labSubject(ctx, (await searchParams).jogador);
  if (subj.kind !== "player") return <LabGate subj={subj} path="/app/lab/treinador" />;
  const { player, own } = subj;
  const q = own ? "" : `?jogador=${player.id}`;
  const [plans, matches, players] = await Promise.all([listPlans(player.id), labMatches(ctx.club.id, player.id), subj.canPick ? listLabPlayers(ctx.club.id) : Promise.resolve(undefined)]);
  const active = plans.filter((p) => p.status === "active");
  const past = plans.filter((p) => p.status !== "active").slice(0, 6);

  return (
    <div className="space-y-6">
      <SubjectBar player={player} own={own} canPick={subj.canPick} players={players} path="/app/lab/treinador" />
      <section aria-labelledby="pergunta">
        <h2 id="pergunta" className="font-display text-2xl font-bold text-ink-100 sm:text-3xl">O que você quer melhorar no seu jogo?</h2>
        <p className="mt-1 mb-4 text-sm text-ink-400">Escolha um tema. O Treinador faz uma pergunta para entender o seu caso e monta um plano com atributos, estilos de jogo, dicas e metas.</p>
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {TOPIC_KEYS.map((k) => {
            const t = TOPICS[k];
            const has = active.some((p) => p.topic === k);
            return (
              <li key={k}>
                <Link href={`/app/lab/treinador/${k}${q}`} className="card group flex h-full flex-col gap-2 p-3 transition-colors hover:border-[var(--line-strong)]">
                  <span className="flex items-center justify-between">
                    <span className="grid size-9 place-items-center rounded-lg border hairline bg-accent-500/10 text-accent-400 group-hover:bg-accent-500/20"><TopicIcon icon={t.icon} className="size-[18px]" /></span>
                    {has && <span className="rounded-full bg-accent-500/15 px-2 py-0.5 text-[10px] font-semibold text-accent-400">Plano ativo</span>}
                  </span>
                  <span className="text-sm leading-snug font-medium text-ink-100">{t.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="planos">
        <h2 id="planos" className="kicker mb-2">Planos ativos · {active.length}</h2>
        {active.length === 0 ? <p className="text-sm text-ink-400">Nenhum plano ativo. Escolha um tema acima ou siga um alerta do analista.</p> : (
          <div className="grid gap-3 lg:grid-cols-2">{active.map((p) => <PlanCard key={p.id} plan={p} matches={matches} canEdit={own} q={q} showTopic />)}</div>
        )}
      </section>
      {past.length > 0 && (
        <section aria-labelledby="anteriores">
          <h2 id="anteriores" className="kicker mb-2">Planos anteriores</h2>
          <div className="grid gap-3 lg:grid-cols-2">{past.map((p) => <PlanCard key={p.id} plan={p} matches={matches} canEdit={false} q={q} showTopic />)}</div>
        </section>
      )}
    </div>
  );
}
