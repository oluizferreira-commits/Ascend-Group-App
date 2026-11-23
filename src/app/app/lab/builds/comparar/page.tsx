import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePage } from "@/server/auth/session";
import { labSubject, listBuilds } from "@/server/services/lab";
import { LabGate } from "@/components/lab/subject";
import { Panel } from "@/components/ui/kit";
import { EmptyState } from "@/components/ui/basics";
import { compareBuilds } from "@/lib/lab/builder";
import { COSTS_STATUS, PLAYSTYLE_BY_KEY, type PlaystyleKey } from "@/lib/lab/game-data";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Comparar builds · Performance Lab" };
const ps = (k: string) => PLAYSTYLE_BY_KEY[k as PlaystyleKey]?.label ?? k;

export default async function CompareBuilds({ searchParams }: { searchParams: Promise<{ jogador?: string; a?: string; b?: string }> }) {
  const ctx = await requirePage("dashboard.view");
  const sp = await searchParams;
  const subj = await labSubject(ctx, sp.jogador);
  if (subj.kind !== "player") return <LabGate subj={subj} path="/app/lab/builds/comparar" />;
  const q = subj.own ? "" : `?jogador=${subj.player.id}`;
  const builds = await listBuilds(subj.player.id);
  const A = builds.find((x) => x.id === sp.a) ?? builds[0];
  const B = builds.find((x) => x.id === sp.b && x.id !== A?.id) ?? builds.find((x) => x.id !== A?.id);
  const picker = (
    <form method="get" className="card mb-5 grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto]">
      {!subj.own && <input type="hidden" name="jogador" value={subj.player.id} />}
      {(["a", "b"] as const).map((k) => (
        <label key={k}><span className="label">Build {k.toUpperCase()}</span>
          <select name={k} defaultValue={(k === "a" ? A : B)?.id} className="input">{builds.map((x) => <option key={x.id} value={x.id}>{x.name}{x.isPrimary ? " (principal)" : ""}</option>)}</select>
        </label>
      ))}
      <div className="flex items-end"><button className="btn-secondary w-full">Comparar</button></div>
    </form>
  );
  if (!A || !B) return (<><Link href={`/app/lab/builds${q}`} className="mb-4 inline-flex items-center gap-1 text-sm text-ink-400"><ArrowLeft className="size-4" />Builds</Link><EmptyState title="Salve pelo menos duas builds para comparar" /></>);
  const doc = (x: typeof A) => ({ name: x.name, archetype: x.archetype, attributes: x.attributes, playstyles: x.playstyles, pointsAvailable: x.pointsAvailable });
  const c = compareBuilds(doc(A), doc(B));
  return (
    <div>
      <Link href={`/app/lab/builds${q}`} className="mb-4 inline-flex items-center gap-1 text-sm text-ink-400 hover:text-ink-200"><ArrowLeft className="size-4" />Builds</Link>
      {picker}
      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <Panel title={`${A.name} × ${B.name}`} bodyClassName="p-2 sm:p-3">
          {c.rows.length === 0 ? <p className="p-3 text-sm text-ink-400">Nenhuma das builds tem atributos preenchidos.</p> : (
            <table className="data-table">
              <thead><tr><th>Atributo</th><th className="text-right">A</th><th className="text-right">B</th><th className="text-right">Dif.</th></tr></thead>
              <tbody>
                {c.rows.map((r) => (
                  <tr key={r.key}>
                    <td>{r.label}</td>
                    <td className="text-right tabular-nums">{r.a ?? "—"}</td>
                    <td className="text-right tabular-nums">{r.b ?? "—"}</td>
                    <td className={cn("text-right font-semibold tabular-nums", r.diff == null ? "text-ink-500" : r.diff > 0 ? "text-win" : r.diff < 0 ? "text-amber-500" : "text-ink-400")}>{r.diff == null ? "—" : r.diff > 0 ? `+${r.diff}` : r.diff}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="px-2 pt-2 text-[11px] text-ink-400">Valores = planejado (ou inicial, quando não há planejado). Dif. = B − A.</p>
        </Panel>
        <div className="space-y-5">
          <Panel title="Por categoria">
            {c.byCat.length === 0 ? <p className="text-sm text-ink-400">Sem atributos em comum.</p> : (
              <ul className="space-y-2.5">
                {c.byCat.map((x) => (
                  <li key={x.cat}>
                    <p className="mb-1 flex justify-between text-sm"><span>{x.label}</span><span className="text-xs text-ink-400 tabular-nums">A {x.a.toFixed(0)} · B {x.b.toFixed(0)}</span></p>
                    <div className="grid grid-cols-2 gap-1">
                      <span className="flex h-1.5 justify-end overflow-hidden rounded-l-full bg-ink-700/60"><span className="h-full rounded-l-full bg-accent-500" style={{ width: `${x.a}%` }} /></span>
                      <span className="h-1.5 overflow-hidden rounded-r-full bg-ink-700/60"><span className="block h-full rounded-r-full bg-[#c9d1dc]" style={{ width: `${x.b}%` }} /></span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Estilos de jogo">
            <p className="kicker mb-1">Só na A</p><p className="mb-2 text-sm">{c.onlyA.map(ps).join(", ") || "—"}</p>
            <p className="kicker mb-1">Só na B</p><p className="mb-2 text-sm">{c.onlyB.map(ps).join(", ") || "—"}</p>
            <p className="kicker mb-1">Nas duas</p><p className="text-sm">{c.both.map(ps).join(", ") || "—"}</p>
          </Panel>
          <Panel title="Pontos">
            <p className="text-sm text-ink-300">A: {A.pointsAvailable ?? "—"} disponíveis · B: {B.pointsAvailable ?? "—"} disponíveis</p>
            {!COSTS_STATUS.verified && <p className="mt-2 text-xs text-amber-500">Pontos utilizados e restantes não são calculados: orçamento não validado.</p>}
          </Panel>
        </div>
      </div>
    </div>
  );
}
