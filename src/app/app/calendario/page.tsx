import type { Metadata } from "next";
import Link from "next/link";
import { requirePage } from "@/server/auth/session";
import { EVENT_TYPE_LABELS, listAgenda } from "@/server/services/calendar";
import { Badge, EmptyState, PageHeader, SectionTitle } from "@/components/ui/basics";
import { EventForm } from "@/components/calendar/forms";

export const metadata: Metadata = { title: "Calendário" };
const dayFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "long" });
const timeFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ passados?: string }> }) {
  const ctx = await requirePage("dashboard.view");
  const past = (await searchParams).passados === "1";
  const now = new Date();
  const from = past ? new Date(now.getTime() - 60 * 86400_000) : new Date(now.getTime() - 6 * 3600_000);
  const to = past ? now : new Date(now.getTime() + 90 * 86400_000);
  const items = await listAgenda(ctx.club.id, from, to);
  const byDay = new Map<string, typeof items>();
  for (const it of past ? [...items].reverse() : items) {
    const k = dayFmt.format(it.at);
    byDay.set(k, [...(byDay.get(k) ?? []), it]);
  }
  const canManage = ctx.permissions.has("calendar.manage");
  return (
    <>
      <PageHeader eyebrow="Agenda" title="Calendário" description="Partidas, treinos, reuniões e convocações."
        actions={<Link href={past ? "/app/calendario" : "/app/calendario?passados=1"} className="btn-secondary">{past ? "Próximos" : "Anteriores"}</Link>} />
      <div className={canManage ? "grid gap-6 lg:grid-cols-[1fr_360px]" : ""}>
        <section className="space-y-5">
          {byDay.size === 0 ? <EmptyState title={past ? "Nada nos últimos 60 dias" : "Nada agendado"} /> : [...byDay.entries()].map(([day, list]) => (
            <div key={day}>
              <p className="eyebrow mb-2 capitalize">{day}</p>
              <ul className="card divide-y divide-ink-800">
                {list.map((it) => (
                  <li key={it.kind + it.id}>
                    <Link href={it.href} className="flex items-center gap-3 px-4 py-3 hover:bg-ink-850">
                      <span className="w-12 font-display text-lg text-gold-300">{timeFmt.format(it.at)}</span>
                      <span className="min-w-0 flex-1 truncate">{it.title}</span>
                      <Badge tone={it.type === "match" ? "gold" : it.type === "training" ? "wine" : "neutral"}>{EVENT_TYPE_LABELS[it.type]}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
        {canManage && <aside className="card h-fit p-5"><SectionTitle>Agendar evento</SectionTitle><EventForm /></aside>}
      </div>
    </>
  );
}
