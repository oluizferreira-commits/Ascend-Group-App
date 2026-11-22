import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePage } from "@/server/auth/session";
import { getClubOverview, listSeasons } from "@/server/services/club";
import { Badge, EmptyState, PageHeader, SectionTitle } from "@/components/ui/basics";
import { CompetitionForm, FORMAT_LABELS } from "@/components/competitions/forms";

export const metadata: Metadata = { title: "Competições" };

export default async function CompetitionsPage() {
  const ctx = await requirePage("competitions.view");
  const [rows, seasons, overview] = await Promise.all([
    db.select({ c: schema.competitions, season: schema.seasons.name }).from(schema.competitions)
      .leftJoin(schema.seasons, eq(schema.seasons.id, schema.competitions.seasonId))
      .where(eq(schema.competitions.clubId, ctx.club.id)).orderBy(desc(schema.competitions.createdAt)),
    listSeasons(ctx.club.id), getClubOverview(ctx.club.id),
  ]);
  const canManage = ctx.permissions.has("competitions.manage");
  return (
    <>
      <PageHeader eyebrow="Competições" title="Campeonatos" description="Participantes, rodadas, resultados e classificação calculada automaticamente." />
      <div className={canManage ? "grid gap-6 lg:grid-cols-[1fr_360px]" : ""}>
        <section>
          {rows.length === 0 ? <EmptyState title="Nenhuma competição" /> : (
            <ul className="grid gap-3 md:grid-cols-2">
              {rows.map(({ c, season }) => (
                <li key={c.id}><Link href={`/app/competicoes/${c.id}`} className="card block p-4 hover:border-gold-600/50">
                  <p className="font-display text-lg font-semibold uppercase">{c.name}</p>
                  <div className="mt-2 flex flex-wrap gap-1"><Badge tone="gold">{FORMAT_LABELS[c.format]}</Badge>{season && <Badge>{season}</Badge>}</div>
                </Link></li>
              ))}
            </ul>
          )}
        </section>
        {canManage && <aside className="card p-5"><SectionTitle>Nova competição</SectionTitle><CompetitionForm seasons={seasons} currentSeasonId={overview.currentSeason?.id} /></aside>}
      </div>
    </>
  );
}
