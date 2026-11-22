import type { Metadata } from "next";
import Link from "next/link";
import { requirePage } from "@/server/auth/session";
import { listEditions, runAwards, trophies } from "@/server/services/awards";
import { Ball } from "@/components/awards/ball";
import { Badge, EmptyState, PageHeader, SectionTitle } from "@/components/ui/basics";
import { Reveal } from "@/components/fx/reveal";
import { AWARD_LABELS, editionStatus } from "@/lib/awards";
import { fmtWeekdayTime } from "@/lib/format";

export const metadata: Metadata = { title: "Premiações" };

export default async function AwardsPage() {
  const ctx = await requirePage("dashboard.view");
  await runAwards(ctx.club.id); // keeps editions/results current even without the scheduler
  const [editions, cabinet] = await Promise.all([listEditions(ctx.club.id), trophies(ctx.club.id)]);
  const live = editions.filter((e) => editionStatus(e) !== "closed").sort((a, b) => a.votingOpensAt.getTime() - b.votingOpensAt.getTime());
  const history = (kind: "gold" | "silver") => editions.filter((e) => e.kind === kind && e.finalizedAt);
  const leaders = [...cabinet.values()].sort((a, b) => b.gold - a.gold || b.silver - a.silver || a.name.localeCompare(b.name));

  return (
    <>
      <PageHeader eyebrow="História do clube" title="Premiações" description="Bola de Prata da semana e Bola de Ouro do mês — escolhidas pelo voto de todo o elenco e da comissão, registradas para sempre." />

      <SectionTitle>Votações</SectionTitle>
      {live.length === 0 ? <EmptyState title="Nenhuma votação agendada" /> : (
        <div className="mb-8 grid gap-3 md:grid-cols-2">
          {live.map((e) => {
            const st = editionStatus(e);
            return (
              <Link key={e.id} href={`/app/premios/${e.id}`} className="card flex items-center gap-4 p-4 transition hover:-translate-y-0.5 hover:border-accent-500">
                <Ball kind={e.kind} size={54} />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-lg font-bold uppercase">{AWARD_LABELS[e.kind]}</p>
                  <p className="truncate text-sm text-ink-300">{e.label}</p>
                  <p className="text-xs text-ink-400 capitalize">{st === "open" ? `Fecha ${fmtWeekdayTime(e.votingClosesAt)}` : `Abre ${fmtWeekdayTime(e.votingOpensAt)}`}</p>
                </div>
                {st === "open" ? <Badge tone="win">Votar agora</Badge> : <Badge>Em breve</Badge>}
              </Link>
            );
          })}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {(["gold", "silver"] as const).map((kind) => (
          <Reveal key={kind}>
            <section className="card p-5">
              <SectionTitle><span className="flex items-center gap-2"><Ball kind={kind} size={22} />{kind === "gold" ? "Bolas de Ouro" : "Bolas de Prata"}</span></SectionTitle>
              {history(kind).length === 0 ? <p className="text-sm text-ink-400">A primeira {AWARD_LABELS[kind]} ainda vai ser decidida.</p> : (
                <ul className="divide-y divide-ink-800">
                  {history(kind).map((e) => (
                    <li key={e.id}>
                      <Link href={`/app/premios/${e.id}`} className="flex items-center gap-3 py-2.5 hover:text-accent-400">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-semibold">{e.winnerName ?? "Sem votos"}{e.winnerShirt != null && <span className="ml-1 text-xs text-ink-400">#{e.winnerShirt}</span>}</span>
                          <span className="block truncate text-xs text-ink-400">{e.label}</span>
                        </span>
                        {e.winnerVotes != null && e.totalVotes ? <span className="font-display font-bold tabular-nums">{Math.round((e.winnerVotes / e.totalVotes) * 100)}%</span> : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </Reveal>
        ))}
        <Reveal delay={0.1}>
          <section className="card p-5">
            <SectionTitle>Maiores vencedores</SectionTitle>
            {leaders.length === 0 ? <p className="text-sm text-ink-400">O ranking aparece após a primeira premiação.</p> : (
              <ol className="space-y-2">
                {leaders.map((l, i) => (
                  <li key={l.name + i} className="flex items-center gap-3">
                    <span className="w-5 font-display text-accent-400">{i + 1}</span>
                    <span className="flex-1 truncate font-medium">{l.name}</span>
                    {l.gold > 0 && <span className="flex items-center gap-1 text-sm"><Ball kind="gold" size={16} />×{l.gold}</span>}
                    {l.silver > 0 && <span className="flex items-center gap-1 text-sm"><Ball kind="silver" size={16} />×{l.silver}</span>}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </Reveal>
      </div>
    </>
  );
}
