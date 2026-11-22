import type { Metadata } from "next";
import Link from "next/link";
import { Plus } from "lucide-react";
import { requirePage } from "@/server/auth/session";
import { listLineups } from "@/server/services/lineups";
import { Badge, EmptyState, PageHeader } from "@/components/ui/basics";
import { fmtDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Escalações e táticas" };

export default async function LineupsPage() {
  const ctx = await requirePage("lineups.view");
  const rows = await listLineups(ctx.club.id);
  return (
    <>
      <PageHeader eyebrow="Comissão técnica" title="Escalações e táticas" description="Formações, titulares, reservas, capitão, cobradores e estratégias por adversário."
        actions={ctx.permissions.has("lineups.manage") && <Link href="/app/escalacoes/nova" className="btn-primary"><Plus className="size-4" />Nova escalação</Link>} />
      {rows.length === 0 ? <EmptyState title="Nenhuma escalação salva" /> : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map(({ lineup: l, formation, opponent, kickoffAt }) => (
            <li key={l.id}>
              <Link href={`/app/escalacoes/${l.id}`} className="card block p-4 hover:border-gold-600/50">
                <div className="flex items-center justify-between gap-2"><p className="font-display text-lg font-semibold uppercase">{l.name}</p><Badge tone="gold">{formation}</Badge></div>
                <p className="mt-1 text-xs text-ink-400">
                  {l.opponentName ? `Estratégia vs ${l.opponentName} · ` : ""}{opponent ? `Partida vs ${opponent} (${fmtDateTime(kickoffAt!)}) · ` : ""}Atualizada {fmtDateTime(l.updatedAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
