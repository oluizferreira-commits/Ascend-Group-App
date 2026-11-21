"use client";
import { useActionState } from "react";
import { RefreshCw } from "lucide-react";
import { Field, FormMessage, SubmitButton, fieldErrors } from "@/components/ui/form";
import { fetchMembersAction, importJsonAction, saveEaConfigAction, syncNowAction } from "@/server/actions/integration";
import { EA_MATCH_TYPES, EA_MATCH_TYPE_LABELS, EA_PLATFORMS, EA_PLATFORM_LABELS } from "@/integrations/ea-fc/types";

export function EaConfigForm({ platform, eaClubId }: { platform: string | null; eaClubId: string | null }) {
  const [state, action] = useActionState(saveEaConfigAction, null);
  const fe = fieldErrors(state);
  return (
    <form action={action} className="space-y-3">
      <Field label="Plataforma" name="platform" error={fe.platform}>
        <select id="platform" name="platform" defaultValue={platform ?? "common-gen5"} className="input">
          {EA_PLATFORMS.map((p) => <option key={p} value={p}>{EA_PLATFORM_LABELS[p]}</option>)}
        </select>
      </Field>
      <Field label="ID do clube na EA" name="eaClubId" error={fe.eaClubId} hint="Número que aparece como clubId na busca da EA.">
        <input id="eaClubId" name="eaClubId" inputMode="numeric" defaultValue={eaClubId ?? ""} className="input" required />
      </Field>
      <FormMessage state={state} />
      <SubmitButton>Salvar</SubmitButton>
    </form>
  );
}

export function SyncNowButton({ disabled }: { disabled: boolean }) {
  const [state, action] = useActionState(syncNowAction, null);
  return (
    <form action={action} className="space-y-3">
      <SubmitButton className="w-full" pendingText="Consultando a EA…"><RefreshCw className="size-4" />Sincronizar agora pelo servidor</SubmitButton>
      {disabled && <p className="text-xs text-ink-400">Configure o clube antes.</p>}
      <FormMessage state={state} />
    </form>
  );
}

export function JsonImportForm() {
  const [state, action] = useActionState(importJsonAction, null);
  return (
    <form action={action} className="space-y-3">
      <Field label="Tipo de partida" name="matchType">
        <select id="matchType" name="matchType" defaultValue="leagueMatch" className="input">
          {EA_MATCH_TYPES.map((t) => <option key={t} value={t}>{EA_MATCH_TYPE_LABELS[t]}</option>)}
        </select>
      </Field>
      <Field label="Arquivo .json" name="file"><input id="file" name="file" type="file" accept="application/json,.json" className="input" /></Field>
      <Field label="…ou cole o JSON" name="json"><textarea id="json" name="json" rows={5} className="input font-mono text-xs" placeholder='[{"matchId":"…","timestamp":…,"clubs":{…},"players":{…}}]' /></Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full" pendingText="Importando…">Importar partidas</SubmitButton>
    </form>
  );
}

export function FetchMembersButton({ disabled }: { disabled: boolean }) {
  const [state, action] = useActionState(fetchMembersAction, null);
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <button disabled={disabled} className="btn-secondary min-h-0 px-3 py-1.5 text-xs">Buscar elenco na EA</button>
      {state && !state.ok && <span className="max-w-xs text-right text-xs text-red-300">{state.error}</span>}
    </form>
  );
}
