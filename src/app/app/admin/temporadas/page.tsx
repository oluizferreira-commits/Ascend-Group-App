import type { Metadata } from "next";
import { requirePage } from "@/server/auth/session";
import { listSeasons } from "@/server/services/club";
import { Badge, PageHeader, SectionTitle } from "@/components/ui/basics";
import { SeasonForm } from "@/components/admin/season-form";

export const metadata: Metadata = { title: "Temporadas" };

export default async function SeasonsPage() {
  const ctx = await requirePage("seasons.manage");
  const seasons = await listSeasons(ctx.club.id);
  return (
    <>
      <PageHeader eyebrow="Administração" title="Temporadas" description="A temporada atual define o recorte do painel, dos rankings e dos destaques." />
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="card p-5"><SectionTitle>Nova temporada</SectionTitle><SeasonForm /></section>
        <section className="space-y-4">
          {seasons.length === 0 && <p className="text-sm text-ink-400">Nenhuma temporada cadastrada.</p>}
          {seasons.map((s) => (
            <details key={s.id} className="card p-5" open={s.isCurrent}>
              <summary className="flex cursor-pointer items-center gap-2 font-display text-lg font-semibold uppercase">
                {s.name} {s.isCurrent && <Badge tone="gold">Atual</Badge>}
              </summary>
              <div className="mt-4"><SeasonForm season={s} /></div>
            </details>
          ))}
        </section>
      </div>
    </>
  );
}
