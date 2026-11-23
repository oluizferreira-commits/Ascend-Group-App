"use client";
import { useActionState } from "react";
import { Field, FormMessage, SubmitButton, fieldErrors } from "@/components/ui/form";
import type { ActionResult } from "@/server/errors";

type Action = (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;

function JsonInput() {
  return (
    <div className="space-y-2">
      <label className="block"><span className="label">Arquivo JSON</span><input type="file" name="file" accept="application/json,.json" className="input py-1.5" /></label>
      <label className="block"><span className="label">… ou cole o JSON</span><textarea name="json" rows={6} className="input font-mono text-xs" placeholder='{ "attrs": { "vision": { "base": 60, "max": 85, "costs": [ … ] } }, "levelBudget": { … } }' /></label>
    </div>
  );
}

export function ImportCostTableForm({ action, defaultVersion }: { action: Action; defaultVersion: string }) {
  const [state, formAction] = useActionState(action, null);
  const fe = fieldErrors(state);
  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Versão do jogo *" name="gameVersion" error={fe.gameVersion}><input id="gameVersion" name="gameVersion" defaultValue={defaultVersion} required className="input" /></Field>
        <Field label="Temporada *" name="season" error={fe.season} hint="Como aparece no jogo / patch"><input id="season" name="season" required className="input" /></Field>
        <Field label="Arquétipo *" name="archetype" error={fe.archetype}><input id="archetype" name="archetype" required className="input" /></Field>
        <Field label="Fonte" name="source" error={fe.source}><input id="source" name="source" className="input" placeholder="De onde vieram os números" /></Field>
        <Field label="Link da fonte" name="sourceUrl" error={fe.sourceUrl}><input id="sourceUrl" name="sourceUrl" inputMode="url" className="input" placeholder="https://…" /></Field>
        <Field label="Notas" name="notes" error={fe.notes}><input id="notes" name="notes" className="input" /></Field>
      </div>
      <JsonInput />
      <p className="text-xs text-ink-400">A tabela entra como <b>rascunho</b>: não valida nenhuma build até ser verificada.</p>
      <div className="flex items-center gap-3"><SubmitButton pendingText="Importando…">Importar como rascunho</SubmitButton><FormMessage state={state} /></div>
    </form>
  );
}

export function ReplaceDraftForm({ action }: { action: Action }) {
  const [state, formAction] = useActionState(action, null);
  return (
    <form action={formAction} className="space-y-3">
      <JsonInput />
      <div className="flex items-center gap-3"><SubmitButton pendingText="Substituindo…">Substituir dados do rascunho</SubmitButton><FormMessage state={state} /></div>
    </form>
  );
}

export function VerifyForm({ action, source, sourceUrl, today, hasWarnings }: { action: Action; source: string | null; sourceUrl: string | null; today: string; hasWarnings: boolean }) {
  const [state, formAction] = useActionState(action, null);
  const fe = fieldErrors(state);
  return (
    <form action={formAction} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Fonte *" name="source" error={fe.source}><input id="source" name="source" defaultValue={source ?? ""} required className="input" /></Field>
        <Field label="Link" name="sourceUrl" error={fe.sourceUrl}><input id="sourceUrl" name="sourceUrl" defaultValue={sourceUrl ?? ""} inputMode="url" className="input" /></Field>
        <Field label="Verificada em *" name="verifiedOn" error={fe.verifiedOn}><input id="verifiedOn" type="date" name="verifiedOn" defaultValue={today} max={today} required className="input" /></Field>
      </div>
      <label className="flex items-start gap-2 text-sm"><input type="checkbox" name="confirm" className="mt-0.5 size-4 accent-[#1c3fb0]" />
        <span>Conferi estes valores com a fonte{hasWarnings ? " e revisei os avisos acima" : ""}. Depois de verificada, a tabela não pode ser alterada — correções viram nova revisão.</span></label>
      {fe.confirm && <p className="text-xs text-loss">{fe.confirm[0]}</p>}
      <div className="flex items-center gap-3"><SubmitButton pendingText="Verificando…">Marcar como verificada</SubmitButton><FormMessage state={state} /></div>
    </form>
  );
}
