"use client";
import { useActionState, useEffect, useRef } from "react";
import { Field, FormMessage, SubmitButton, fieldErrors } from "@/components/ui/form";
import { addTeamAction, createCompetitionAction, saveFixtureAction } from "@/server/actions/competitions";

export const FORMAT_LABELS = { league: "Pontos corridos", knockout: "Mata-mata", groups_knockout: "Grupos + mata-mata", friendly: "Amistosos", ea_division: "Divisões EA" } as const;

export function CompetitionForm({ seasons, currentSeasonId }: { seasons: { id: string; name: string }[]; currentSeasonId?: string }) {
  const [state, action] = useActionState(createCompetitionAction, null);
  const fe = fieldErrors(state);
  return (
    <form action={action} className="space-y-3">
      <Field label="Nome *" name="name" error={fe.name}><input id="name" name="name" required maxLength={80} className="input" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Temporada" name="seasonId"><select id="seasonId" name="seasonId" defaultValue={currentSeasonId ?? ""} className="input"><option value="">—</option>{seasons.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></Field>
        <Field label="Formato" name="format"><select id="format" name="format" defaultValue="league" className="input">{Object.entries(FORMAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
        <Field label="Pontos por vitória" name="pointsWin"><input id="pointsWin" name="pointsWin" type="number" min={0} max={10} defaultValue={3} className="input" /></Field>
        <Field label="Pontos por empate" name="pointsDraw"><input id="pointsDraw" name="pointsDraw" type="number" min={0} max={10} defaultValue={1} className="input" /></Field>
      </div>
      <Field label="Regulamento / observações" name="notes"><textarea id="notes" name="notes" rows={3} maxLength={2000} className="input" /></Field>
      <FormMessage state={state} />
      <SubmitButton className="w-full">Criar competição</SubmitButton>
    </form>
  );
}

export function TeamForm({ compId }: { compId: string }) {
  const [state, action] = useActionState(addTeamAction.bind(null, compId), null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok) ref.current?.reset(); }, [state]);
  return (
    <form ref={ref} action={action} className="flex flex-wrap items-end gap-2">
      <label className="min-w-40 flex-1 text-sm"><span className="label">Time</span><input name="name" required maxLength={80} className="input" /></label>
      <label className="w-24 text-sm"><span className="label">Grupo</span><input name="groupName" maxLength={20} className="input" /></label>
      <SubmitButton>Adicionar</SubmitButton>
      <div className="w-full"><FormMessage state={state} /></div>
    </form>
  );
}

type Team = { id: string; name: string };
type Fx = { id: string; round: string | null; homeTeamId: string; awayTeamId: string; scheduledAt: string; homeGoals: number | null; awayGoals: number | null; matchId: string | null };

export function FixtureForm({ compId, teams, matches, fixture }: { compId: string; teams: Team[]; matches: { id: string; label: string }[]; fixture?: Fx }) {
  const [state, action] = useActionState(saveFixtureAction.bind(null, compId, fixture?.id ?? null), null);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => { if (state?.ok && !fixture) ref.current?.reset(); }, [state, fixture]);
  return (
    <form ref={ref} action={action} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      <label className="text-xs"><span className="label">Rodada</span><input name="round" defaultValue={fixture?.round ?? ""} maxLength={40} className="input" /></label>
      <label className="text-xs"><span className="label">Data</span><input name="scheduledAt" type="datetime-local" defaultValue={fixture?.scheduledAt ?? ""} className="input" /></label>
      <label className="text-xs"><span className="label">Mandante</span><select name="homeTeamId" required defaultValue={fixture?.homeTeamId ?? ""} className="input"><option value="" disabled>—</option>{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
      <label className="text-xs"><span className="label">Visitante</span><select name="awayTeamId" required defaultValue={fixture?.awayTeamId ?? ""} className="input"><option value="" disabled>—</option>{teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
      <label className="text-xs"><span className="label">Gols mandante</span><input name="homeGoals" type="number" min={0} max={99} defaultValue={fixture?.homeGoals ?? ""} className="input" /></label>
      <label className="text-xs"><span className="label">Gols visitante</span><input name="awayGoals" type="number" min={0} max={99} defaultValue={fixture?.awayGoals ?? ""} className="input" /></label>
      <label className="col-span-2 text-xs"><span className="label">Partida do Ascend (placar automático)</span><select name="matchId" defaultValue={fixture?.matchId ?? ""} className="input"><option value="">—</option>{matches.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}</select></label>
      <div className="col-span-2 sm:col-span-4 flex items-center justify-between gap-2"><FormMessage state={state} /><SubmitButton>{fixture ? "Salvar" : "Adicionar jogo"}</SubmitButton></div>
    </form>
  );
}
