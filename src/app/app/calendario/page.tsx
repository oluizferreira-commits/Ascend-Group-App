import type { Metadata } from "next";
import Link from "next/link";
import { requirePage } from "@/server/auth/session";
import { EVENT_TYPE_LABELS, listAgenda } from "@/server/services/calendar";
import { EmptyState, PageHeader } from "@/components/ui/basics";
import { DateBadge, Panel } from "@/components/ui/kit";
import { CalendarPlus, Dumbbell, Swords, Users, CalendarDays } from "lucide-react";
import { cn } from "@/lib/cn";
import { EventForm } from "@/components/calendar/forms";

export const metadata: Metadata = { title: "Calendário" };
const dayFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", weekday: "long", day: "2-digit", month: "long" });
const TYPE_STYLE = {
  match: { I: Swords, bar: "bg-[#3a63f0]", icon: "bg-accent-500/15 text-accent-400" },
  training: { I: Dumbbell, bar: "bg-win", icon: "bg-win/10 text-win" },
  meeting: { I: Users, bar: "bg-silver", icon: "bg-ink-500/15 text-ink-300" },
  other: { I: CalendarDays, bar: "bg-ink-500", icon: "bg-ink-500/15 text-ink-300" },
} as const;
const timeFmt = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" });

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ passados?: string }> }) {
  const ctx = await requirePage("dashboard.view");
  const past = (await searchParams).passados === "1";
  const now = new Date();
  const from = past ? new Date(now.getTime() - 60 * 86400_000) : new Date(now.getTime() - 6 * 3600_000);
  const to = past ? now : new Date(now.getTime() + 3 * 365 * 86400_000);
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
            <div key={day} className="flex gap-3 sm:gap-4">
              <div className="flex flex-col items-center">
                <DateBadge date={list[0].at} />
                <span aria-hidden className="mt-2 w-px flex-1 bg-gradient-to-b from-[var(--line-strong)] to-transparent" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="kicker mb-2 pt-1">{day}</p>
                <ul className="space-y-2">
                  {list.map((it) => {
                    const T = TYPE_STYLE[it.type];
                    return (
                      <li key={it.kind + it.id}>
                        <Link href={it.href} className="card flex items-center gap-3 overflow-hidden py-2.5 pr-3 pl-0 transition-colors hover:border-[var(--line-strong)]">
                          <span aria-hidden className={cn("w-1 self-stretch rounded-r", T.bar)} />
                          <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg border hairline", T.icon)}><T.I className="size-[18px]" /></span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{it.title}</span>
                            <span className="block text-xs text-ink-400">{EVENT_TYPE_LABELS[it.type]}</span>
                          </span>
                          <span className="font-display text-xl font-bold text-ink-100 tabular-nums">{timeFmt.format(it.at)}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          ))}
        </section>
        {canManage && <aside className="h-fit"><Panel title="Agendar evento" icon={CalendarPlus}><EventForm /></Panel></aside>}
      </div>
    </>
  );
}
