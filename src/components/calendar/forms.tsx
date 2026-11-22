"use client";
import { useActionState } from "react";
import { Field, FormMessage, SubmitButton, fieldErrors } from "@/components/ui/form";
import { addAvailabilityAction, callupPlayersAction, respondCallupAction, saveEventAction } from "@/server/actions/calendar";

export function EventForm({ event }: { event?: { id: string; type: string; title: string; startsAt: string; endsAt: string; description: string | null } }) {
  const [state, action] = useActionState(saveEventAction.bind(null, event?.id ?? null), null);
  const fe = fieldErrors(state);
  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Tipo" name="type"><select id="type" name="type" defaultValue={event?.type ?? "training"} className="input"><option value="training">Treino</option><option value="meeting">Reunião</option><option value="match">Partida</option><option value="other">Outro</option></select></Field>
        <Field label="Título *" name="title" error={fe.title}><input id="title" name="title" required maxLength={100} defaultValue={event?.title} className="input" /></Field>
        <Field label="Início (Brasília) *" name="startsAt" error={fe.startsAt}><input id="startsAt" name="startsAt" type="datetime-local" required defaultValue={event?.startsAt} className="input" /></Field>
        <Field label="Término" name="endsAt" error={fe.endsAt}><input id="endsAt" name="endsAt" type="datetime-local" defaultValue={event?.endsAt} className="input" /></Field>
      </div>
      <Field label="Descrição" name="description"><textarea id="description" name="description" rows={3} maxLength={2000} defaultValue={event?.description ?? ""} className="input" /></Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full">{event ? "Salvar alterações" : "Agendar"}</SubmitButton>
    </form>
  );
}

type Opt = { id: string; nickname: string; position: string; availability: string | null; reason: string | null };
const AV = { available: ["Disponível", "text-green-300"], unavailable: ["Indisponível", "text-red-300"], doubtful: ["Dúvida", "text-gold-300"] } as const;

export function CallupForm({ eventId, players }: { eventId: string; players: Opt[] }) {
  const [state, action] = useActionState(callupPlayersAction.bind(null, eventId), null);
  if (players.length === 0) return <p className="text-sm text-ink-400">Todos os jogadores ativos já foram convocados.</p>;
  return (
    <form action={action} className="space-y-3">
      <ul className="grid max-h-80 gap-1 overflow-y-auto sm:grid-cols-2">
        {players.map((p) => (
          <li key={p.id}>
            <label className="flex cursor-pointer items-center gap-2 rounded-md border border-ink-700 px-2 py-1.5 text-sm hover:border-gold-600/50">
              <input type="checkbox" name="playerIds" value={p.id} defaultChecked={p.availability !== "unavailable"} />
              <span className="flex-1 truncate">{p.nickname} <span className="text-xs text-ink-400">{p.position}</span></span>
              {p.availability && <span className={`text-[10px] ${AV[p.availability as keyof typeof AV][1]}`} title={p.reason ?? ""}>{AV[p.availability as keyof typeof AV][0]}</span>}
            </label>
          </li>
        ))}
      </ul>
      <FormMessage state={state} />
      <SubmitButton>Convocar selecionados</SubmitButton>
    </form>
  );
}

export function RespondForm({ eventId, current }: { eventId: string; current: string }) {
  const [state, action] = useActionState(respondCallupAction.bind(null, eventId), null);
  return (
    <form action={action} className="space-y-2">
      <input name="note" maxLength={300} placeholder="Observação (opcional)" className="input" />
      <div className="flex gap-2">
        <button name="status" value="confirmed" className={current === "confirmed" ? "btn-primary flex-1" : "btn-secondary flex-1"}>Confirmar presença</button>
        <button name="status" value="declined" className={current === "declined" ? "btn-danger flex-1" : "btn-secondary flex-1"}>Não poderei</button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

export function AvailabilityForm() {
  const [state, action] = useActionState(addAvailabilityAction, null);
  const fe = fieldErrors(state);
  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Situação" name="status" className="col-span-2"><select id="status" name="status" defaultValue="unavailable" className="input"><option value="available">Disponível</option><option value="unavailable">Indisponível</option><option value="doubtful">Dúvida</option></select></Field>
        <Field label="De *" name="startsOn" error={fe.startsOn}><input id="startsOn" name="startsOn" type="date" required className="input" /></Field>
        <Field label="Até" name="endsOn" error={fe.endsOn} hint="Vazio = até avisar"><input id="endsOn" name="endsOn" type="date" className="input" /></Field>
      </div>
      <Field label="Motivo" name="reason"><input id="reason" name="reason" maxLength={300} className="input" placeholder="Opcional" /></Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full">Registrar</SubmitButton>
    </form>
  );
}
