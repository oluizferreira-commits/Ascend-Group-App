import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { Crest } from "@/components/crest";
import { AnnouncementCard } from "@/components/announcement-card";
import { ResultPill, StatTile } from "@/components/ui/basics";
import { getPublicClub } from "@/server/services/club";
import { clubRecord } from "@/server/services/stats";
import { recentResults } from "@/server/services/matches";
import { listActiveAnnouncements } from "@/server/services/announcements";
import { getSessionUser } from "@/server/auth/session";
import { matchResult } from "@/lib/domain";
import { fmtDate, fmtPct } from "@/lib/format";

export default async function PublicHome() {
  const [pub, user] = await Promise.all([getPublicClub(), getSessionUser()]);
  if (!pub) {
    return (
      <main className="grid min-h-dvh place-items-center p-6 text-center">
        <div><Crest size={96} /><p className="mt-4 text-ink-400">Plataforma ainda não configurada. Rode <code>npm run db:setup</code>.</p></div>
      </main>
    );
  }
  const [season] = await db.select().from(schema.seasons).where(and(eq(schema.seasons.clubId, pub.club.id), eq(schema.seasons.isCurrent, true)));
  const [record, recent, news] = await Promise.all([
    clubRecord({ clubId: pub.club.id, seasonId: season?.id ?? null }),
    recentResults(pub.club.id, 5, season?.id ?? null),
    listActiveAnnouncements(pub.club.id, ["public"], 4),
  ]);

  return (
    <main className="min-h-dvh">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <span className="eyebrow">{pub.org.name}</span>
        <Link href={user ? "/app" : "/login"} className="btn-secondary">{user ? "Abrir painel" : "Área do clube"}</Link>
      </header>

      <section className="mx-auto flex max-w-6xl flex-col items-center px-4 pt-6 pb-14 text-center sm:px-6">
        <div className="animate-rise"><Crest size={200} priority /></div>
        <h1 className="mt-6 font-display text-6xl font-bold tracking-wider uppercase gold-text sm:text-7xl">{pub.club.name}</h1>
        <p className="mt-2 font-display text-lg tracking-[0.4em] text-ink-300">{pub.org.motto}</p>
        <div className="gold-rule mt-8 max-w-md" />
        <p className="mt-4 text-sm text-ink-400">EA SPORTS FC™ Pro Clubs{season ? ` · Temporada ${season.name}` : ""}{season?.division ? ` · ${season.division}` : ""}</p>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatTile label="Partidas" value={record.played} />
          <StatTile label="Vitórias" value={record.wins} accent="win" />
          <StatTile label="Empates" value={record.draws} accent="draw" />
          <StatTile label="Derrotas" value={record.losses} accent="loss" />
          <StatTile label="Aproveitamento" value={fmtPct(record.pointsPct)} accent="gold" />
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-20 sm:px-6 lg:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 font-display text-lg font-semibold tracking-wider uppercase">Últimos resultados</h2>
          {recent.length === 0 ? <p className="text-sm text-ink-400">Nenhum resultado publicado.</p> : (
            <ul className="divide-y divide-ink-800">
              {recent.map(({ match: m, competition }) => (
                <li key={m.id} className="flex items-center gap-3 py-2.5">
                  <ResultPill result={matchResult(m.goalsFor!, m.goalsAgainst!)} />
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm">vs {m.opponentName}</span><span className="text-xs text-ink-400">{fmtDate(m.kickoffAt)} · {competition ?? "Sem competição"}</span></span>
                  <span className="font-display text-xl font-bold">{m.goalsFor}–{m.goalsAgainst}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-5">
          <h2 className="mb-3 font-display text-lg font-semibold tracking-wider uppercase">Comunicados</h2>
          {news.length === 0 ? <p className="text-sm text-ink-400">Nenhum comunicado público.</p> : <div className="space-y-3">{news.map((a) => <AnnouncementCard key={a.id} a={a} compact />)}</div>}
        </div>
      </section>

      <footer className="border-t border-ink-800 py-6 text-center text-xs text-ink-400">
        © {pub.org.name} · {pub.club.name}. EA SPORTS FC é marca da Electronic Arts; esta plataforma não é afiliada à EA.
      </footer>
    </main>
  );
}
