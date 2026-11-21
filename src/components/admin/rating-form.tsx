"use client";
import { useActionState, useRef } from "react";
import { FormMessage, SubmitButton } from "@/components/ui/form";
import { saveRatingConfigAction } from "@/server/actions/admin";

export function RatingConfigForm({ groups, metrics, weights, defaults, externalWeight, minMatchesPct }: {
  groups: { key: string; label: string }[];
  metrics: { key: string; label: string; unit: string }[];
  weights: Record<string, Record<string, number>>;
  defaults: Record<string, Record<string, number>>;
  externalWeight: number;
  minMatchesPct: number;
}) {
  const [state, action] = useActionState(saveRatingConfigAction, null);
  const ref = useRef<HTMLFormElement>(null);
  const restoreDefaults = () => {
    const f = ref.current;
    if (!f) return;
    for (const g of groups) for (const m of metrics) {
      const el = f.elements.namedItem(`${g.key}.${m.key}`) as HTMLInputElement | null;
      if (el) el.value = defaults[g.key]?.[m.key]?.toString() ?? "";
    }
  };
  return (
    <form ref={ref} action={action} className="space-y-6">
      <div className="card grid gap-4 p-5 sm:grid-cols-2">
        <label className="text-sm">
          <span className="label">Peso da nota do jogo (EA) quando disponível: %</span>
          <input name="externalWeight" type="number" min={0} max={100} defaultValue={externalWeight} className="input" />
          <span className="mt-1 block text-xs text-ink-400">0 = usar apenas a nota calculada; 100 = usar apenas a nota do jogo.</span>
        </label>
        <label className="text-sm">
          <span className="label">Participação mínima para prêmios: % das partidas do clube</span>
          <input name="minMatchesPct" type="number" min={0} max={100} defaultValue={minMatchesPct} className="input" />
          <span className="mt-1 block text-xs text-ink-400">Evita que um jogador com 1 jogo lidere “Melhor jogador”.</span>
        </label>
      </div>
      <div className="card overflow-x-auto p-5">
        <table className="data-table">
          <thead>
            <tr><th>Estatística</th><th>Unidade</th>{groups.map((g) => <th key={g.key} className="text-center">{g.label}</th>)}</tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <tr key={m.key}>
                <td className="font-medium">{m.label}</td>
                <td className="text-xs text-ink-400">{m.unit}</td>
                {groups.map((g) => (
                  <td key={g.key} className="text-center">
                    <input name={`${g.key}.${m.key}`} type="number" step="0.01" min={-5} max={5} defaultValue={weights[g.key]?.[m.key] ?? ""} placeholder="0"
                      className="input w-20 py-1 text-center" aria-label={`${m.label} — ${g.label}`} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <FormMessage state={state} />
      <div className="flex justify-end gap-2">
        <button type="button" onClick={restoreDefaults} className="btn-secondary">Restaurar padrão</button>
        <SubmitButton>Salvar critérios</SubmitButton>
      </div>
    </form>
  );
}
