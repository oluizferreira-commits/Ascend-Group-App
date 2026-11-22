import type { Metadata } from "next";
import { and, asc, desc, eq, gte, isNull, or } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePage } from "@/server/auth/session";
import { deleteAvailabilityAction } from "@/server/actions/calendar";
import { Badge, EmptyState, PageHeader, SectionTitle } from "@/components/ui/basics";
import { AvailabilityForm } from "@/components/calendar/forms";
import { fmtDate } from "@/lib/format";

export const metadata: Metadata = { title: "Disponibilidade" };
const L = { available: ["Disponível", "win"], unavailable: ["Indisponível", "loss"], doubtful: ["Dúvida", "gold"] } as const;
const d = (s: string) => fmtDate(s + "T12:00:00Z");

export default async function AvailabilityPage() {
  const ctx = await requirePage("dashboard.view");
  const today = new Date().toISOString().slice(0, 10);
  const mine = ctx.playerId ? await db.select().from(schema.playerAvailability).where(eq(schema.playerAvailability.playerId, ctx.playerId)).orderBy(desc(schema.playerAvailability.startsOn)).limit(30) : [];
  const team = ctx.permissions.has("callups.manage") ? await db.select({ a: schema.playerAvailability, p: schema.players.nickname }).from(schema.playerAvailability)
    .innerJoin(schema.players, eq(schema.players.id, schema.playerAvailability.playerId))
    .where(and(eq(schema.players.clubId, ctx.club.id), or(isNull(schema.playerAvailability.endsOn), gte(schema.playerAvailability.endsOn, today))))
    .orderBy(asc(schema.playerAvailability.startsOn)) : [];
  return (
    <>
      <PageHeader eyebrow="Convocações" title="Disponibilidade" description="Avise a comissão técnica quando não puder jogar." />
      <div className="grid gap-6 lg:grid-cols-2">
        {ctx.permissions.has("availability.self") && (
          <section className="card p-5">
            <SectionTitle>Minha disponibilidade</SectionTitle>
            {ctx.playerId ? <>
              <AvailabilityForm />
              <ul className="mt-4 divide-y divide-ink-800 text-sm">
                {mine.map((a) => (
                  <li key={a.id} className="flex items-center gap-2 py-2">
                    <Badge tone={L[a.status][1]}>{L[a.status][0]}</Badge>
                    <span className="flex-1">{d(a.startsOn)}{a.endsOn ? ` a ${d(a.endsOn)}` : " em diante"}{a.reason && <span className="text-ink-400"> · {a.reason}</span>}</span>
                    <form action={deleteAvailabilityAction.bind(null, a.id)}><button className="btn-ghost min-h-0 px-2 py-0.5 text-xs text-loss">remover</button></form>
                  </li>
                ))}
              </ul>
            </> : <p className="text-sm text-ink-400">Sua conta não está vinculada a um jogador do elenco.</p>}
          </section>
        )}
        {ctx.permissions.has("callups.manage") && (
          <section className="card p-5">
            <SectionTitle>Elenco · registros atuais e futuros</SectionTitle>
            {team.length === 0 ? <EmptyState title="Nenhum registro" /> : (
              <ul className="divide-y divide-ink-800 text-sm">
                {team.map(({ a, p }) => (
                  <li key={a.id} className="flex items-center gap-2 py-2">
                    <b className="w-32 truncate">{p}</b><Badge tone={L[a.status][1]}>{L[a.status][0]}</Badge>
                    <span className="flex-1 text-ink-300">{d(a.startsOn)}{a.endsOn ? ` a ${d(a.endsOn)}` : " em diante"}{a.reason && <span className="text-ink-400"> · {a.reason}</span>}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </div>
    </>
  );
}
