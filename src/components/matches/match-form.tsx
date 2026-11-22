"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Field, FormMessage, SubmitButton, fieldErrors } from "@/components/ui/form";
import { TEAM_STAT_KEYS } from "@/lib/validation/match";
import type { ActionResult } from "@/server/errors";

export type MatchFormInitial = {
  opponentName?: string; kickoff?: string; status?: string; goalsFor?: number | null; goalsAgainst?: number | null;
  seasonId?: string | null; competitionId?: string | null; formationId?: string | null; round?: string | null; notes?: string | null;
  teamStats?: Record<string, number>;
};

export function MatchForm({
  action, initial = {}, seasons, competitions, formations, cancelHref,
}: {
  action: (prev: ActionResult | null, f: FormData) => Promise<ActionResult>;
  initial?: MatchFormInitial;
  seasons: { id: string; name: string }[];
  competitions: { id: string; name: string }[];
  formations: { id: string; name: string }[];
  cancelHref: string;
}) {
  const [state, formAction] = useActionState(action, null);
  const [status, setStatus] = useState(initial.status ?? "scheduled");
  const fe = fieldErrors(state);
  return (
    <form action={formAction} className="card space-y-6 p-5 sm:p-6">
      <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <legend className="eyebrow mb-3">Partida</legend>
        <Field label="Adversário *" name="opponentName" error={fe.opponentName} className="sm:col-span-2">
          <input id="opponentName" name="opponentName" required maxLength={80} defaultValue={initial.opponentName} className="input" />
        </Field>
        <Field label="Data e horário (Brasília) *" name="kickoff" error={fe.kickoff}>
          <input id="kickoff" name="kickoff" type="datetime-local" required defaultValue={initial.kickoff} className="input" />
        </Field>
        <Field label="Situação *" name="status" error={fe.status}>
          <select id="status" name="status" value={status} onChange={(e) => setStatus(e.target.value)} className="input">
            <option value="scheduled">Agendada</option>
            <option value="finished">Encerrada</option>
            <option value="cancelled">Cancelada</option>
          </select>
        </Field>
        {status === "finished" && (
          <>
            <Field label="Gols Ascend CF *" name="goalsFor" error={fe.goalsFor}>
              <input id="goalsFor" name="goalsFor" type="number" min={0} max={99} required defaultValue={initial.goalsFor ?? ""} className="input" />
            </Field>
            <Field label="Gols adversário *" name="goalsAgainst" error={fe.goalsAgainst}>
              <input id="goalsAgainst" name="goalsAgainst" type="number" min={0} max={99} required defaultValue={initial.goalsAgainst ?? ""} className="input" />
            </Field>
          </>
        )}
        <Field label="Temporada" name="seasonId" error={fe.seasonId}>
          <select id="seasonId" name="seasonId" defaultValue={initial.seasonId ?? ""} className="input">
            <option value="">Sem temporada</option>
            {seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
        <Field label="Competição" name="competitionId" error={fe.competitionId} hint={competitions.length === 0 ? "Competições serão gerenciadas na Fase 5." : undefined}>
          <select id="competitionId" name="competitionId" defaultValue={initial.competitionId ?? ""} className="input">
            <option value="">Amistoso / sem competição</option>
            {competitions.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Rodada / fase" name="round" error={fe.round}>
          <input id="round" name="round" maxLength={60} defaultValue={initial.round ?? ""} className="input" />
        </Field>
        <Field label="Formação utilizada" name="formationId" error={fe.formationId}>
          <select id="formationId" name="formationId" defaultValue={initial.formationId ?? ""} className="input">
            <option value="">Não informada</option>
            {formations.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </Field>
        <Field label="Observações" name="notes" error={fe.notes} className="sm:col-span-2 lg:col-span-4">
          <textarea id="notes" name="notes" rows={3} maxLength={2000} defaultValue={initial.notes ?? ""} className="input" />
        </Field>
      </fieldset>

      {status === "finished" && (
        <details className="rounded-lg border border-ink-700 p-4" open={!!initial.teamStats && Object.keys(initial.teamStats).length > 0}>
          <summary className="cursor-pointer eyebrow">Estatísticas coletivas (opcional)</summary>
          <p className="mt-2 mb-3 text-xs text-ink-400">Preencha apenas o que estiver disponível. Campos vazios ficam como “não registrado”.</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Object.entries(TEAM_STAT_KEYS).map(([k, label]) => (
              <Field key={k} label={label} name={`team_${k}`}>
                <input id={`team_${k}`} name={`team_${k}`} type="number" min={0} max={k === "possession" || k === "passAccuracy" ? 100 : 2000} defaultValue={initial.teamStats?.[k] ?? ""} className="input" />
              </Field>
            ))}
          </div>
        </details>
      )}

      <FormMessage state={state} />
      <div className="flex justify-end gap-2">
        <Link href={cancelHref} className="btn-secondary">Cancelar</Link>
        <SubmitButton>Salvar partida</SubmitButton>
      </div>
    </form>
  );
}
