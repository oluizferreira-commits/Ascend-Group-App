import type { Metadata } from "next";
import Link from "next/link";
import { GitCompareArrows, Plus, Star } from "lucide-react";
import { requirePage } from "@/server/auth/session";
import { labSubject, listBuilds, listLabPlayers } from "@/server/services/lab";
import { LabGate, SubjectBar } from "@/components/lab/subject";
import { EmptyState } from "@/components/ui/basics";
import { COSTS_STATUS } from "@/lib/lab/game-data";
import { isTopic, TOPICS } from "@/lib/lab/trainer";

export const metadata: Metadata = { title: "Builds · Performance Lab" };
const day = (d: Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "2-digit" }).format(d);

export default async function BuildsPage({ searchParams }: { searchParams: Promise<{ jogador?: string }> }) {
  const ctx = await requirePage("dashboard.view");
  const subj = await labSubject(ctx, (await searchParams).jogador);
  if (subj.kind !== "player") return <LabGate subj={subj} path="/app/lab/builds" />;
  const { player, own } = subj;
  const q = own ? "" : `?jogador=${player.id}`;
  const [builds, players] = await Promise.all([listBuilds(player.id), subj.canPick ? listLabPlayers(ctx.club.id) : Promise.resolve(undefined)]);
  return (
    <div className="space-y-5">
      <SubjectBar player={player} own={own} canPick={subj.canPick} players={players} path="/app/lab/builds" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="kicker">Builds salvas · {builds.length}</h2>
        <div className="flex gap-2">
          {builds.length >= 2 && <Link href={`/app/lab/builds/comparar${q}`} className="btn-secondary"><GitCompareArrows className="size-4" />Comparar</Link>}
          {own && <Link href="/app/lab/builds/nova" className="btn-primary"><Plus className="size-4" />Nova build</Link>}
        </div>
      </div>
      {builds.length === 0 ? (
        <EmptyState title="Nenhuma build salva" action={own ? <Link href="/app/lab/builds/nova" className="btn-primary">Criar primeira build</Link> : undefined}>
          Monte sua build por categoria, gere prioridades a partir do seu estilo e compare versões.
        </EmptyState>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {builds.map((b) => {
            const planned = Object.values(b.attributes).filter((v) => v.planned != null && v.initial != null && v.planned > v.initial).length;
            return (
              <li key={b.id}>
                <Link href={`/app/lab/builds/${b.id}${q}`} className="card flex h-full flex-col gap-2 p-4 transition-colors hover:border-[var(--line-strong)]">
                  <span className="flex items-start justify-between gap-2">
                    <span className="min-w-0 font-display text-lg leading-tight font-bold text-ink-100">{b.name}</span>
                    {b.isPrimary && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-accent-500/15 px-2 py-0.5 text-[11px] font-semibold text-accent-400"><Star className="size-3" />Principal</span>}
                  </span>
                  <span className="text-xs text-ink-400">{[b.archetype, b.role, b.level ? `nível ${b.level}` : null].filter(Boolean).join(" · ") || "Sem arquétipo informado"}</span>
                  <span className="mt-auto flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-400">
                    <span>{Object.keys(b.attributes).length} atributos · {planned} com evolução planejada</span>
                    <span>{b.playstyles.length} estilos</span>
                    {b.focusTopic && isTopic(b.focusTopic.split(":")[0]) && <span>Foco: {TOPICS[b.focusTopic.split(":")[0] as keyof typeof TOPICS].short}</span>}
                    <span>Atualizada {day(b.updatedAt)}</span>
                    {b.startedUsingOn && <span className="text-win">Em uso desde {b.startedUsingOn.split("-").reverse().join("/")}</span>}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
      {!COSTS_STATUS.verified && <p className="text-[11px] text-ink-400">Orçamento não validado: o Lab ainda não tem a tabela de custos verificada do FC 27 Clubs.</p>}
    </div>
  );
}
