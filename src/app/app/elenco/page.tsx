import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requirePage } from "@/server/auth/session";
import { getClubOverview, listSeasons } from "@/server/services/club";
import { listPlayers } from "@/server/services/players";
import { getSeasonStats } from "@/server/services/stats";
import { Avatar, Badge, EmptyState, PageHeader } from "@/components/ui/basics";
import {
  PLAYER_STATUSES, PLAYER_STATUS_LABELS, POSITION_GROUPS, POSITION_GROUP_LABELS, POSITION_LABELS, positionGroup,
  type PlayerStatus, type PositionGroup,
} from "@/lib/domain";
import { fmtNum } from "@/lib/format";

export const metadata: Metadata = { title: "Elenco" };

const SORTS = { nickname: "Nome", matches: "Partidas", goals: "Gols", assists: "Assistências", ga: "Participações em gols", rating: "Nota média" } as const;
type Sort = keyof typeof SORTS;

const statusTone = (s: PlayerStatus) =>
  s === "starter" ? "gold" : s === "available" ? "win" : s === "inactive" ? "neutral" : s === "reserve" ? "draw" : "loss";

export default async function RosterPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requirePage("players.view");
  const sp = await searchParams;
  const [overview, seasons, players] = await Promise.all([getClubOverview(ctx.club.id), listSeasons(ctx.club.id), listPlayers(ctx.club.id)]);
  const seasonId = sp.season === "all" ? null : sp.season && seasons.some((s) => s.id === sp.season) ? sp.season : overview.currentSeason?.id ?? null;
  const stats = await getSeasonStats({ clubId: ctx.club.id, seasonId });

  const group = POSITION_GROUPS.includes(sp.group as PositionGroup) ? (sp.group as PositionGroup) : undefined;
  const status = PLAYER_STATUSES.includes(sp.status as PlayerStatus) ? (sp.status as PlayerStatus) : undefined;
  const sort: Sort = sp.sort && sp.sort in SORTS ? (sp.sort as Sort) : "nickname";
  const minMatches = Math.max(0, Number(sp.min) || 0);

  const rows = players
    .map((p) => ({ p, s: stats.summaryMap.get(p.id)! }))
    .filter(({ p, s }) =>
      (!group || positionGroup(p.primaryPosition) === group) &&
      (status ? p.status === status : sp.status === "all" ? true : p.status !== "inactive") &&
      s.matches >= minMatches)
    .sort((a, b) => {
      switch (sort) {
        case "matches": return b.s.matches - a.s.matches;
        case "goals": return b.s.goals - a.s.goals;
        case "assists": return b.s.assists - a.s.assists;
        case "ga": return b.s.goalInvolvements - a.s.goalInvolvements;
        case "rating": return (b.s.avgRating ?? -1) - (a.s.avgRating ?? -1);
        default: return a.p.nickname.localeCompare(b.p.nickname);
      }
    });

  return (
    <>
      <PageHeader
        eyebrow="Gestão do elenco"
        title="Elenco"
        description={`${players.filter((p) => p.status !== "inactive").length} jogadores ativos. Estatísticas: ${seasonId ? seasons.find((s) => s.id === seasonId)?.name : "todas as temporadas"}.`}
        actions={ctx.permissions.has("players.manage") && <Link href="/app/elenco/novo" className="btn-primary"><Plus className="size-4" />Novo jogador</Link>}
      />

      <form className="card mb-5 grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 lg:grid-cols-6" method="get">
        <div>
          <label className="label" htmlFor="season">Temporada</label>
          <select id="season" name="season" defaultValue={seasonId ?? "all"} className="input">
            <option value="all">Todas</option>
            {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="group">Posição</label>
          <select id="group" name="group" defaultValue={group ?? ""} className="input">
            <option value="">Todas</option>
            {POSITION_GROUPS.map((g) => <option key={g} value={g}>{POSITION_GROUP_LABELS[g]}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="status">Situação</label>
          <select id="status" name="status" defaultValue={status ?? sp.status ?? ""} className="input">
            <option value="">Ativos</option>
            <option value="all">Todos (inclui inativos)</option>
            {PLAYER_STATUSES.map((s) => <option key={s} value={s}>{PLAYER_STATUS_LABELS[s]}</option>)}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="min">Mín. de partidas</label>
          <input id="min" name="min" type="number" min={0} defaultValue={minMatches || ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="sort">Ordenar por</label>
          <select id="sort" name="sort" defaultValue={sort} className="input">
            {Object.entries(SORTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="flex items-end"><button className="btn-secondary w-full">Filtrar</button></div>
      </form>

      {rows.length === 0 ? (
        <EmptyState
          title={players.length === 0 ? "Nenhum jogador cadastrado" : "Nenhum jogador com esses filtros"}
          action={players.length === 0 && ctx.permissions.has("players.manage") ? <Link href="/app/elenco/novo" className="btn-primary">Cadastrar o primeiro jogador</Link> : undefined}
        />
      ) : (
        <>
          {/* Mobile cards */}
          <ul className="grid gap-3 sm:hidden">
            {rows.map(({ p, s }) => (
              <li key={p.id}>
                <Link href={`/app/elenco/${p.id}`} className="card flex items-center gap-3 p-3">
                  <Avatar name={p.nickname} src={p.avatarUrl} size={44} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{p.shirtNumber != null && <span className="mr-1 text-gold-400">#{p.shirtNumber}</span>}{p.nickname}</p>
                    <p className="text-xs text-ink-400">{POSITION_LABELS[p.primaryPosition]} · {s.matches} J · {s.goals} G · {s.assists} A</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-xl font-bold text-gold-300">{fmtNum(s.avgRating, 1)}</p>
                    <Badge tone={statusTone(p.status)}>{PLAYER_STATUS_LABELS[p.status]}</Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
          {/* Desktop table */}
          <div className="card hidden overflow-x-auto sm:block">
            <table className="data-table">
              <thead>
                <tr>
                  <th>#</th><th>Jogador</th><th>Posição</th><th>Situação</th>
                  <th className="text-right">J</th><th className="text-right">V-E-D</th><th className="text-right">Gols</th>
                  <th className="text-right">Assist.</th><th className="text-right">G+A</th><th className="text-right">G/J</th><th className="text-right">Nota</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ p, s }) => (
                  <tr key={p.id}>
                    <td className="font-display text-gold-400">{p.shirtNumber ?? "—"}</td>
                    <td>
                      <Link href={`/app/elenco/${p.id}`} className="flex items-center gap-3 hover:text-gold-300">
                        <Avatar name={p.nickname} src={p.avatarUrl} size={32} />
                        <span><span className="block font-medium">{p.nickname}</span><span className="block text-xs text-ink-400">{p.fullName}</span></span>
                      </Link>
                    </td>
                    <td>{POSITION_LABELS[p.primaryPosition]}{p.secondaryPositions.length > 0 && <span className="text-xs text-ink-400"> / {p.secondaryPositions.map((x) => POSITION_LABELS[x]).join(", ")}</span>}</td>
                    <td><Badge tone={statusTone(p.status)}>{PLAYER_STATUS_LABELS[p.status]}</Badge></td>
                    <td className="text-right">{s.matches}</td>
                    <td className="text-right text-ink-300">{s.wins}-{s.draws}-{s.losses}</td>
                    <td className="text-right">{s.goals}</td>
                    <td className="text-right">{s.assists}</td>
                    <td className="text-right font-semibold">{s.goalInvolvements}</td>
                    <td className="text-right text-ink-300">{fmtNum(s.goalsPerMatch, 2)}</td>
                    <td className="text-right font-display text-lg font-bold text-gold-300">{fmtNum(s.avgRating, 1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
