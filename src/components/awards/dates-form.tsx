"use client";
import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { updateEditionDatesAction } from "@/server/actions/awards";

export function EditionDatesForm({ id, opens, closes }: { id: string; opens: string; closes: string }) {
  const [state, action] = useActionState(updateEditionDatesAction.bind(null, id), null);
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <label className="text-sm"><span className="label">Abre (Brasília)</span><input name="opens" type="datetime-local" defaultValue={opens} className="input" /></label>
      <label className="text-sm"><span className="label">Fecha (Brasília)</span><input name="closes" type="datetime-local" defaultValue={closes} className="input" /></label>
      <SubmitButton>Salvar datas</SubmitButton>
      <div className="sm:col-span-3"><FormMessage state={state} /></div>
    </form>
  );
}
