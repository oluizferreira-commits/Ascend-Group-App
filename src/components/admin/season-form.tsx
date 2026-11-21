"use client";
import { useActionState } from "react";
import { Field, FormMessage, SubmitButton, fieldErrors } from "@/components/ui/form";
import { saveSeasonAction } from "@/server/actions/admin";

type S = { id: string; name: string; startsOn: string; endsOn: string | null; division: string | null; leaguePosition: number | null; isCurrent: boolean };

export function SeasonForm({ season }: { season?: S }) {
  const [state, action] = useActionState(saveSeasonAction.bind(null, season?.id ?? null), null);
  const fe = fieldErrors(state);
  const p = season?.id ?? "new";
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-2">
      <Field label="Nome *" name={`name-${p}`} error={fe.name}><input id={`name-${p}`} name="name" required maxLength={40} defaultValue={season?.name} placeholder="Ex.: Temporada 1" className="input" /></Field>
      <Field label="Divisão" name={`division-${p}`} error={fe.division}><input id={`division-${p}`} name="division" maxLength={60} defaultValue={season?.division ?? ""} className="input" /></Field>
      <Field label="Início *" name={`startsOn-${p}`} error={fe.startsOn}><input id={`startsOn-${p}`} name="startsOn" type="date" required defaultValue={season?.startsOn} className="input" /></Field>
      <Field label="Término" name={`endsOn-${p}`} error={fe.endsOn}><input id={`endsOn-${p}`} name="endsOn" type="date" defaultValue={season?.endsOn ?? ""} className="input" /></Field>
      <Field label="Posição na classificação" name={`leaguePosition-${p}`} error={fe.leaguePosition}><input id={`leaguePosition-${p}`} name="leaguePosition" type="number" min={1} defaultValue={season?.leaguePosition ?? ""} className="input" /></Field>
      <label className="flex items-center gap-2 self-end pb-2 text-sm"><input type="checkbox" name="isCurrent" defaultChecked={season?.isCurrent ?? !season} /> Temporada atual</label>
      <div className="sm:col-span-2"><FormMessage state={state} /></div>
      <div className="sm:col-span-2 flex justify-end"><SubmitButton>{season ? "Salvar" : "Criar temporada"}</SubmitButton></div>
    </form>
  );
}
