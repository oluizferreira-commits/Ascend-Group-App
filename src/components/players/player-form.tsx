"use client";
import { useActionState } from "react";
import Link from "next/link";
import { Field, FormMessage, SubmitButton, fieldErrors } from "@/components/ui/form";
import { FEET, FOOT_LABELS, PLAYER_STATUSES, PLAYER_STATUS_LABELS, POSITIONS, POSITION_LABELS, POSITION_NAMES } from "@/lib/domain";
import type { ActionResult } from "@/server/errors";

export type PlayerFormValues = {
  fullName?: string; nickname?: string; eaName?: string | null; avatarUrl?: string | null; shirtNumber?: number | null;
  primaryPosition?: string; secondaryPositions?: string[]; preferredFoot?: string | null; overall?: number | null;
  playStyle?: string | null; joinedOn?: string | null; status?: string; userId?: string | null;
};

export function PlayerForm({
  action, initial = {}, users, cancelHref,
}: {
  action: (prev: ActionResult | null, form: FormData) => Promise<ActionResult>;
  initial?: PlayerFormValues;
  users: { id: string; name: string; email: string }[];
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const fe = fieldErrors(state);
  return (
    <form action={formAction} className="card space-y-6 p-5 sm:p-6">
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="eyebrow mb-3">Identificação</legend>
        <Field label="Nome completo *" name="fullName" error={fe.fullName}>
          <input id="fullName" name="fullName" required defaultValue={initial.fullName} className="input" maxLength={120} />
        </Field>
        <Field label="Nickname *" name="nickname" error={fe.nickname}>
          <input id="nickname" name="nickname" required defaultValue={initial.nickname} className="input" maxLength={40} />
        </Field>
        <Field label="Nome / ID no EA FC" name="eaName" error={fe.eaName} hint="Usado para vincular estatísticas importadas.">
          <input id="eaName" name="eaName" defaultValue={initial.eaName ?? ""} className="input" maxLength={60} />
        </Field>
        <Field label="Número da camisa" name="shirtNumber" error={fe.shirtNumber}>
          <input id="shirtNumber" name="shirtNumber" type="number" min={1} max={99} defaultValue={initial.shirtNumber ?? ""} className="input" />
        </Field>
        <Field label="Foto (URL https)" name="avatarUrl" error={fe.avatarUrl} className="sm:col-span-2">
          <input id="avatarUrl" name="avatarUrl" type="url" placeholder="https://…" defaultValue={initial.avatarUrl ?? ""} className="input" />
        </Field>
        <Field label="Conta vinculada" name="userId" error={fe.userId} hint="Permite que o jogador veja o próprio perfil e informe disponibilidade.">
          <select id="userId" name="userId" defaultValue={initial.userId ?? ""} className="input">
            <option value="">— Sem conta —</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.email})</option>)}
          </select>
        </Field>
        <Field label="Data de entrada no clube" name="joinedOn" error={fe.joinedOn}>
          <input id="joinedOn" name="joinedOn" type="date" defaultValue={initial.joinedOn ?? ""} className="input" />
        </Field>
      </fieldset>

      <div className="accent-rule" />

      <fieldset className="grid gap-4 sm:grid-cols-3">
        <legend className="eyebrow mb-3">Perfil esportivo</legend>
        <Field label="Posição principal *" name="primaryPosition" error={fe.primaryPosition}>
          <select id="primaryPosition" name="primaryPosition" required defaultValue={initial.primaryPosition ?? ""} className="input">
            <option value="" disabled>Selecione</option>
            {POSITIONS.map((p) => <option key={p} value={p}>{POSITION_LABELS[p]} — {POSITION_NAMES[p]}</option>)}
          </select>
        </Field>
        <Field label="Pé dominante" name="preferredFoot" error={fe.preferredFoot}>
          <select id="preferredFoot" name="preferredFoot" defaultValue={initial.preferredFoot ?? ""} className="input">
            <option value="">Não informado</option>
            {FEET.map((f) => <option key={f} value={f}>{FOOT_LABELS[f]}</option>)}
          </select>
        </Field>
        <Field label="Overall" name="overall" error={fe.overall} hint="Somente se informado no jogo.">
          <input id="overall" name="overall" type="number" min={1} max={99} defaultValue={initial.overall ?? ""} className="input" />
        </Field>
        <div className="sm:col-span-3">
          <span className="label">Posições secundárias</span>
          <div className="flex flex-wrap gap-2">
            {POSITIONS.map((p) => (
              <label key={p} className="cursor-pointer">
                <input type="checkbox" name="secondaryPositions" value={p} defaultChecked={initial.secondaryPositions?.includes(p)} className="peer sr-only" />
                <span className="inline-block rounded-md border border-ink-600 px-2.5 py-1 text-xs text-ink-300 peer-checked:border-accent-500 peer-checked:bg-accent-500/10 peer-checked:text-accent-300 peer-focus-visible:ring-2 peer-focus-visible:ring-accent-400">
                  {POSITION_LABELS[p]}
                </span>
              </label>
            ))}
          </div>
        </div>
        <Field label="Situação no elenco *" name="status" error={fe.status}>
          <select id="status" name="status" defaultValue={initial.status ?? "available"} className="input">
            {PLAYER_STATUSES.map((s) => <option key={s} value={s}>{PLAYER_STATUS_LABELS[s]}</option>)}
          </select>
        </Field>
        <Field label="Características de jogo" name="playStyle" error={fe.playStyle} className="sm:col-span-2">
          <textarea id="playStyle" name="playStyle" rows={3} defaultValue={initial.playStyle ?? ""} className="input" maxLength={500} placeholder="Ex.: velocidade, finalização de média distância, bom no 1x1…" />
        </Field>
      </fieldset>

      <FormMessage state={state} />
      <div className="flex justify-end gap-2">
        <Link href={cancelHref} className="btn-secondary">Cancelar</Link>
        <SubmitButton>Salvar jogador</SubmitButton>
      </div>
    </form>
  );
}
