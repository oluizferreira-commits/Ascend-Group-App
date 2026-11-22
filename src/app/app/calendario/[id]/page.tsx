import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, ne } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { db, schema } from "@/db";
import { requirePage } from "@/server/auth/session";
import { ATTENDANCE_LABELS, EVENT_TYPE_LABELS, availabilityOn, getEvent } from "@/server/services/calendar";
import { deleteEventAction, removeCallupAction, setAttendanceAction } from "@/server/actions/calendar";
import { Badge, PageHeader, SectionTitle } from "@/components/ui/basics";
import { ConfirmSubmit } from "@/components/ui/confirm-button";
import { CallupForm, EventForm, RespondForm } from "@/components/calendar/forms";
import { POSITION_LABELS } from "@/lib/domain";
import { fmtDateTime, fmtWeekdayTime, toLocalInput } from "@/lib/format";

export const metadata: Metadata = { title: "Evento" };
const tone = { pending: "neutral", confirmed: "win", declined: "loss", present: "gold", absent: "loss" } as const;

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requirePage("dashboard.view");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const e = await getEvent(ctx.club.id, id);
  if (!e) notFound();
  const canCall = ctx.permissions.has("callups.manage"), canEdit = ctx.permissions.has("calendar.manage");
  const day = e.startsAt.toISOString().slice(0, 10);
  const called = new Set(e.attendance.map((a) => a.p.id));
  const others = canCall ? await db.select().from(schema.players).where(and(eq(schema.players.clubId, ctx.club.id), ne(schema.players.status, "inactive"))).orderBy(asc(schema.players.nickname)) : [];
  const avail = await availabilityOn([...others.map((p) => p.id), ...called], day);
  const mine = ctx.playerId ? e.attendance.find((a) => a.p.id === ctx.playerId) : undefined;
  const counts = Object.fromEntries(Object.keys(ATTENDANCE_LABELS).map((k) => [k, e.attendance.filter((a) => a.a.status === k).length]));

  return (
    <>
      <PageHeader eyebrow={EVENT_TYPE_LABELS[e.type]} title={e.title} description={`${fmtWeekdayTime(e.startsAt)}${e.endsAt ? ` até ${fmtDateTime(e.endsAt)}` : ""}`}
        actions={<>
          {e.matchId && <Link href={`/app/partidas/${e.matchId}`} className="btn-secondary">Ver partida</Link>}
          {canEdit && <form action={deleteEventAction.bind(null, id)}><ConfirmSubmit className="btn-danger" message="Excluir o evento e as convocações?"><Trash2 className="size-4" />Excluir</ConfirmSubmit></form>}
        </>} />
      {e.description && <p className="card mb-6 p-4 text-sm whitespace-pre-line text-ink-300">{e.description}</p>}

      {mine && (
        <section className="card-premium mb-6 p-5">
          <SectionTitle>Sua convocação · <Badge tone={tone[mine.a.status]}>{ATTENDANCE_LABELS[mine.a.status]}</Badge></SectionTitle>
          <RespondForm eventId={id} current={mine.a.status} />
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section className="card overflow-x-auto p-5">
          <SectionTitle>Convocados ({e.attendance.length})</SectionTitle>
          <div className="mb-3 flex flex-wrap gap-2 text-xs">{Object.entries(ATTENDANCE_LABELS).map(([k, v]) => <Badge key={k} tone={tone[k as keyof typeof tone]}>{v}: {counts[k]}</Badge>)}</div>
          {e.attendance.length === 0 ? <p className="text-sm text-ink-400">Ninguém convocado ainda.</p> : (
            <table className="data-table">
              <thead><tr><th>Jogador</th><th>Status</th><th>Disponibilidade</th><th>Obs.</th>{canCall && <th />}</tr></thead>
              <tbody>
                {e.attendance.map(({ a, p }) => {
                  const av = avail.get(p.id);
                  return (
                    <tr key={a.id}>
                      <td>{p.nickname} <span className="text-xs text-ink-400">{POSITION_LABELS[p.primaryPosition]}</span></td>
                      <td><Badge tone={tone[a.status]}>{ATTENDANCE_LABELS[a.status]}</Badge></td>
                      <td className="text-xs">{av ? { available: "Disponível", unavailable: "Indisponível", doubtful: "Dúvida" }[av.status] : "—"}</td>
                      <td className="max-w-40 truncate text-xs text-ink-400" title={a.note ?? ""}>{a.note ?? ""}</td>
                      {canCall && (
                        <td className="flex gap-1">
                          <form action={setAttendanceAction.bind(null, id, p.id, "present")}><button className="btn-ghost min-h-0 px-1.5 py-0.5 text-xs">Presente</button></form>
                          <form action={setAttendanceAction.bind(null, id, p.id, "absent")}><button className="btn-ghost min-h-0 px-1.5 py-0.5 text-xs">Ausente</button></form>
                          <form action={removeCallupAction.bind(null, id, p.id)}><button className="btn-ghost min-h-0 px-1.5 py-0.5 text-xs text-loss">×</button></form>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>
        <aside className="space-y-6">
          {canCall && (
            <section className="card p-5">
              <SectionTitle>Convocar</SectionTitle>
              <CallupForm eventId={id} players={others.filter((p) => !called.has(p.id)).map((p) => ({
                id: p.id, nickname: p.nickname, position: POSITION_LABELS[p.primaryPosition],
                availability: avail.get(p.id)?.status ?? null, reason: avail.get(p.id)?.reason ?? null,
              }))} />
            </section>
          )}
          {canEdit && (
            <section className="card p-5"><SectionTitle>Editar evento</SectionTitle>
              <EventForm event={{ id, type: e.type, title: e.title, startsAt: toLocalInput(e.startsAt), endsAt: e.endsAt ? toLocalInput(e.endsAt) : "", description: e.description }} />
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
