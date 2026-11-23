"use client";
import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import type { ActionResult } from "@/server/errors";

export function StartUsingForm({ action, defaultDay, maxDay }: { action: (prev: ActionResult | null, form: FormData) => Promise<ActionResult>; defaultDay: string; maxDay: string }) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className="space-y-2">
      <label className="block"><span className="label">Comecei a usar esta build em</span>
        <input type="date" name="startedOn" defaultValue={defaultDay} max={maxDay} required className="input" /></label>
      <SubmitButton pendingText="Registrando…">Registrar início</SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
