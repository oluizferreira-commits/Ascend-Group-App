import type { Metadata } from "next";
import Link from "next/link";
import { History, Plus } from "lucide-react";
import { requirePage } from "@/server/auth/session";
import { listSeasons } from "@/server/services/club";
import { headToHead, listMatches } from "@/server/services/matches";
import { listCompetitions } from "@/server/services/reference";
import { getEaConfig, lastEaUpdate } from "@/server/services/ea-sync";
import { RefreshEaButton } from "@/components/integration/refresh-ea-button";
import { Badge, EmptyState, PageHeader } from "@/components/ui/basics";
import { DateBadge, Panel, ScoreBox, TeamMonogram } from "@/components/ui/kit";
import { MATCH_STATUS_LABELS, SOURCE_LABELS, matchResult } from "@/lib/domain";

export const metadata: Metadata = { title: "Partidas" };
const monthFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", month: "long", year: "numeric" });
const timeFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });

export default async function MatchesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requirePage("matches.view");
  const sp = await searchParams;
  const [seasons, competitions] = await Promise.all([listSeasons(ctx.club.id), listCompetitions(ctx.club.id)]);
  const seasonId = seasons.some((s) => s.id === sp.season) ? sp.season : undefined;
  const competitionId = competitions.some((c) => c.id === sp.competition) ? sp.competition : undefined;
  const status = ["scheduled", "finished", "cancelled"].includes(sp.status ?? "") ? (sp.status as "scheduled") : undefined;
  const opponent = sp.q?.slice(0, 80) || undefined;
  const [rows, h2h, eaCfg, eaLast] = await Promise.all([listMatches(ctx.club.id, { seasonId, competitionId, status, opponent }), headToHead(ctx.club.id), getEaConfig(ctx.club.id), lastEaUpdate(ctx.club.id)]);
  const groups = [...rows.reduce((acc, r) => {
    const k = monthFmt.format(r.match.kickoffAt);
    acc.set(k, [...(acc.get(k) ?? []), r]);
    return acc;
  }, new Map<string, typeof rows>())];

  return (
    <>
      <PageHeader
        eyebrow="Sistema esportivo"
        title="Partidas"
        actions={<>
          {eaCfg.eaClubId && eaCfg.platform && <RefreshEaButton lastAt={eaLast?.toISOString() ?? null} serverNow={new Date().getTime()} className="items-start sm:items-end" />}
          {ctx.permissions.has("matches.manage") && <Link href="/app/partidas/nova" className="btn-primary self-start"><Plus className="size-4" />Nova partida</Link>}
        </>}
      />
      <form method="get" className="card mb-6 grid grid-cols-2 gap-3 p-4 lg:grid-cols-5">
        <div className="col-span-2 lg:col-span-1">
          <label className="label" htmlFor="q">Adversário</label>
          <input id="q" name="q" defaultValue={opponent} className="input" placeholder="Buscar…" />
        </div>
        <div>
          <label className="label" htmlFor="season">Temporada</label>
          <select id="season" name="season" defaultValue={seasonId ?? ""} className="input">
            <option value="">Todas</option>{seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="competition">Competição</label>
          <select id="competition" name="competition" defaultValue={competitionId ?? ""} className="input">
            <option value="">Todas</option>{competitions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="status">Situação</label>
          <select id="status" name="status" defaultValue={status ?? ""} className="input">
            <option value="">Todas</option>{Object.entries(MATCH_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="flex items-end"><button className="btn-secondary w-full">Filtrar</button></div>
      </form>

      {rows.length === 0 ? (
        <EmptyState title="Nenhuma partida encontrada" action={ctx.permissions.has("matches.manage") ? <Link href="/app/partidas/nova" className="btn-primary">Registrar partida</Link> : undefined} />
      ) : (
        <div className="mb-8 space-y-5">
          {groups.map(([month, list]) => (
            <section key={month}>
              <h2 className="kicker mb-2 px-1">{month}</h2>
              <ul className="card divide-y divide-[var(--line)] overflow-hidden">
                {list.map(({ match: m, competition, season }) => {
                  const res = m.status === "finished" ? matchResult(m.goalsFor!, m.goalsAgainst!) : null;
                  return (
                    <li key={m.id}>
                      <Link href={`/app/partidas/${m.id}`} className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-[var(--surface-2)] sm:px-4">
                        <DateBadge date={m.kickoffAt} />
                        <TeamMonogram name={m.opponentName} size={34} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-display text-[17px] font-bold tracking-wide uppercase">vs {m.opponentName}</p>
                          <p className="truncate text-xs text-ink-400">{timeFmt.format(m.kickoffAt)} · {competition ?? "Sem competição"}{season ? ` · ${season}` : ""}{m.round ? ` · ${m.round}` : ""}</p>
                        </div>
                        {m.source !== "manual" && <Badge className="hidden sm:inline-flex">{SOURCE_LABELS[m.source]}</Badge>}
                        {res ? (
                          <ScoreBox gf={m.goalsFor!} ga={m.goalsAgainst!} result={res} />
                        ) : (
                          <Badge tone={m.status === "cancelled" ? "loss" : "gold"}>{MATCH_STATUS_LABELS[m.status]}</Badge>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}

      {h2h.length > 0 && (
        <Panel title="Histórico contra adversários" icon={History} bodyClassName="overflow-x-auto p-2 sm:p-3">
          <table className="data-table">
            <thead><tr><th>Adversário</th><th className="text-right">J</th><th className="text-right">V</th><th className="text-right">E</th><th className="text-right">D</th><th className="text-right">GP</th><th className="text-right">GC</th></tr></thead>
            <tbody>
              {h2h.map((r) => (
                <tr key={r.opponent}>
                  <td><Link href={`/app/partidas?q=${encodeURIComponent(r.opponent)}`} className="hover:text-accent-300">{r.opponent}</Link></td>
                  <td className="text-right">{r.played}</td><td className="text-right text-win">{r.wins}</td><td className="text-right">{r.draws}</td>
                  <td className="text-right text-loss">{r.losses}</td><td className="text-right">{r.gf}</td><td className="text-right">{r.ga}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      )}
    </>
  );
}
