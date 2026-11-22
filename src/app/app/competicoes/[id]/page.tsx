import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { db, schema } from "@/db";
import { requirePage } from "@/server/auth/session";
import { getCompetition } from "@/server/services/fixtures";
import { deleteCompetitionAction, deleteFixtureAction, removeTeamAction } from "@/server/actions/competitions";
import { Badge, PageHeader, SectionTitle } from "@/components/ui/basics";
import { ConfirmSubmit } from "@/components/ui/confirm-button";
import { FORMAT_LABELS, FixtureForm, TeamForm } from "@/components/competitions/forms";
import { fmtDateTime, toLocalInput } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Competição" };

export default async function CompetitionPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePage("competitions.view");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const c = await getCompetition(ctx.club.id, id);
  if (!c) notFound();
  const canManage = ctx.permissions.has("competitions.manage");
  const teamName = new Map(c.teams.map((t) => [t.id, t.name]));
  const clubMatches = canManage ? await db.select().from(schema.matches)
    .where(and(eq(schema.matches.clubId, ctx.club.id), eq(schema.matches.competitionId, id))).orderBy(desc(schema.matches.kickoffAt)).limit(60) : [];
  const matchOpts = clubMatches.map((m) => ({ id: m.id, label: `${fmtDateTime(m.kickoffAt)} vs ${m.opponentName}` }));
  const groups = [...new Set(c.standings.map((s) => s.group_name ?? ""))];

  return (
    <>
      <PageHeader eyebrow={`${FORMAT_LABELS[c.format]}${c.season ? ` · ${c.season}` : ""}`} title={c.name} description={c.notes ?? undefined}
        actions={canManage && <form action={deleteCompetitionAction.bind(null, id)}><ConfirmSubmit className="btn-danger" message="Excluir a competição, times e jogos? (Partidas do Ascend não são apagadas.)"><Trash2 className="size-4" />Excluir</ConfirmSubmit></form>} />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <section className="card overflow-x-auto p-5">
            <SectionTitle>Classificação</SectionTitle>
            <p className="-mt-2 mb-3 text-xs text-ink-400">Critérios: pontos ({c.pointsWin}/V, {c.pointsDraw}/E), saldo, gols pró.</p>
            {groups.map((g) => (
              <div key={g} className="mb-4">
                {g && <p className="eyebrow mb-1">Grupo {g}</p>}
                <table className="data-table">
                  <thead><tr><th>#</th><th>Time</th><th className="text-right">P</th><th className="text-right">J</th><th className="text-right">V</th><th className="text-right">E</th><th className="text-right">D</th><th className="text-right">GP</th><th className="text-right">GC</th><th className="text-right">SG</th></tr></thead>
                  <tbody>
                    {c.standings.filter((s) => (s.group_name ?? "") === g).map((s, i) => (
                      <tr key={s.team_id} className={cn(s.is_own_club && "bg-wine-900/40")}>
                        <td className="font-display text-gold-400">{i + 1}</td>
                        <td className={cn(s.is_own_club && "font-semibold text-gold-300")}>{s.team_name}</td>
                        <td className="text-right font-bold">{s.points}</td><td className="text-right">{s.played}</td><td className="text-right">{s.won}</td><td className="text-right">{s.drawn}</td><td className="text-right">{s.lost}</td>
                        <td className="text-right">{s.goals_for}</td><td className="text-right">{s.goals_against}</td><td className="text-right">{s.goal_difference}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </section>

          <section className="card p-5">
            <SectionTitle>Jogos e rodadas</SectionTitle>
            {c.fixtures.length === 0 ? <p className="text-sm text-ink-400">Nenhum jogo cadastrado.</p> : (
              <ul className="divide-y divide-ink-800">
                {c.fixtures.map((f) => (
                  <li key={f.id} className="py-2.5">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      {f.round && <Badge>{f.round}</Badge>}
                      <span className="flex-1">{teamName.get(f.homeTeamId)} <b className="mx-1 font-display text-lg text-gold-300">{f.homeGoals ?? "–"} × {f.awayGoals ?? "–"}</b> {teamName.get(f.awayTeamId)}</span>
                      {f.scheduledAt && <span className="text-xs text-ink-400">{fmtDateTime(f.scheduledAt)}</span>}
                      {f.matchId && <Link href={`/app/partidas/${f.matchId}`} className="text-xs text-gold-400 hover:underline">súmula</Link>}
                    </div>
                    {canManage && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs text-ink-400">Editar</summary>
                        <div className="mt-2"><FixtureForm compId={id} teams={c.teams} matches={matchOpts}
                          fixture={{ ...f, scheduledAt: f.scheduledAt ? toLocalInput(f.scheduledAt) : "" }} /></div>
                        <form action={deleteFixtureAction.bind(null, id, f.id)} className="mt-1"><ConfirmSubmit className="btn-ghost min-h-0 px-2 py-1 text-xs text-red-300" message="Excluir este jogo?">Excluir jogo</ConfirmSubmit></form>
                      </details>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {canManage && c.teams.length >= 2 && <div className="mt-4 border-t border-ink-800 pt-4"><p className="eyebrow mb-2">Novo jogo</p><FixtureForm compId={id} teams={c.teams} matches={matchOpts} /></div>}
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card p-5">
            <SectionTitle>Participantes ({c.teams.length})</SectionTitle>
            <ul className="mb-4 space-y-1 text-sm">
              {c.teams.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-2">
                  <span className={cn(t.isOwnClub && "text-gold-300")}>{t.name}{t.groupName && <span className="text-xs text-ink-400"> · Grupo {t.groupName}</span>}</span>
                  {canManage && !t.isOwnClub && <form action={removeTeamAction.bind(null, id, t.id)}><ConfirmSubmit className="btn-ghost min-h-0 px-2 py-0.5 text-xs text-red-300" message={`Remover ${t.name} e seus jogos?`}>remover</ConfirmSubmit></form>}
                </li>
              ))}
            </ul>
            {canManage && <TeamForm compId={id} />}
          </section>
          <section className="card overflow-x-auto p-5">
            <SectionTitle>Artilharia do Ascend</SectionTitle>
            {c.scorers.length === 0 ? <p className="text-sm text-ink-400">Sem gols registrados nesta competição.</p> : (
              <table className="data-table"><thead><tr><th>Jogador</th><th className="text-right">J</th><th className="text-right">G</th><th className="text-right">A</th></tr></thead>
                <tbody>{c.scorers.map((s) => <tr key={s.playerId}><td><Link href={`/app/elenco/${s.playerId}`} className="hover:text-gold-300">{s.nickname}</Link></td><td className="text-right">{s.matches}</td><td className="text-right font-semibold text-gold-300">{s.goals}</td><td className="text-right">{s.assists}</td></tr>)}</tbody>
              </table>
            )}
          </section>
        </aside>
      </div>
    </>
  );
}
