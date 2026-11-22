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
import { getThemeMode } from "@/lib/theme";
import { ThemeToggle } from "@/components/theme-toggle";
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

  const theme = await getThemeMode();
  return (
    <main className="min-h-dvh">
      <header className="scope-dark sticky top-0 z-20 border-b border-white/5 bg-[#060a16] text-ink-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <Crest size={40} priority />
            <span className="leading-none">
              <span className="block font-display text-xl font-bold tracking-[0.08em] text-white uppercase">{pub.club.name}</span>
              <span className="mt-1 block font-display text-[10px] font-semibold tracking-[0.3em] text-silver uppercase">{pub.org.name}</span>
            </span>
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle initial={theme} />
            <Link href={user ? "/app" : "/login"} className="btn-primary">{user ? "Abrir painel" : "Área do clube"}</Link>
          </div>
        </div>
      </header>

      <section className="card-premium rounded-none border-x-0 border-t-0">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 py-14 text-center sm:px-6 md:flex-row md:py-20 md:text-left">
          <Crest size={240} priority />
          <div>
            <p className="font-display text-sm font-semibold tracking-[0.4em] text-silver uppercase">EA SPORTS FC™ Pro Clubs</p>
            <h1 className="mt-2 font-display text-7xl leading-[0.9] font-bold tracking-[0.03em] text-white uppercase sm:text-8xl">{pub.club.name}</h1>
            <p className="mt-4 font-display text-lg font-medium tracking-[0.45em] text-silver">{pub.org.motto}</p>
            <p className="mt-6 text-sm text-ink-300">{season ? `Temporada ${season.name}` : "Temporada em definição"}{season?.division ? ` · ${season.division}` : ""}</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <StatTile label="Partidas" value={record.played} />
          <StatTile label="Vitórias" value={record.wins} accent="win" />
          <StatTile label="Empates" value={record.draws} accent="draw" />
          <StatTile label="Derrotas" value={record.losses} accent="loss" />
          <StatTile label="Aproveitamento" value={fmtPct(record.pointsPct)} accent="gold" />
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-6 px-4 pb-20 sm:px-6 lg:grid-cols-2">
        <div className="card p-6">
          <h2 className="mb-4 font-display text-xl font-bold tracking-[0.1em] uppercase">Últimos resultados</h2>
          {recent.length === 0 ? <p className="text-sm text-ink-400">Nenhum resultado publicado.</p> : (
            <ul className="divide-y divide-ink-700">
              {recent.map(({ match: m, competition }) => (
                <li key={m.id} className="flex items-center gap-3 py-3">
                  <ResultPill result={matchResult(m.goalsFor!, m.goalsAgainst!)} />
                  <span className="min-w-0 flex-1"><span className="block truncate font-medium">vs {m.opponentName}</span><span className="text-xs text-ink-400">{fmtDate(m.kickoffAt)} · {competition ?? "Sem competição"}</span></span>
                  <span className="font-display text-2xl font-bold tabular-nums">{m.goalsFor}–{m.goalsAgainst}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="card p-6">
          <h2 className="mb-4 font-display text-xl font-bold tracking-[0.1em] uppercase">Comunicados</h2>
          {news.length === 0 ? <p className="text-sm text-ink-400">Nenhum comunicado público.</p> : <div className="space-y-3">{news.map((a) => <AnnouncementCard key={a.id} a={a} compact />)}</div>}
        </div>
      </section>

      <footer className="scope-dark bg-[#060a16] py-8 text-center text-xs text-ink-400">
        <p className="mb-2 font-display text-sm tracking-[0.4em] text-silver">RISE. CONQUER. ASCEND.</p>
        © {pub.org.name} · {pub.club.name}. EA SPORTS FC é marca da Electronic Arts; esta plataforma não é afiliada à EA.
      </footer>
    </main>
  );
}
