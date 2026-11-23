/** Performance Lab presentation components (server-safe). */
import Link from "next/link";
import { AlertTriangle, ArrowRight, Database, Info, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/cn";
import type { Insight } from "@/lib/lab/diagnostics";
import { fmtMetric, type MetricDef, type MetricValue } from "@/lib/lab/metrics";

export const TONE = {
  positive: { ring: "border-win/35", bg: "bg-win/[0.06]", text: "text-win", bar: "bg-win", label: "Evolução", Icon: TrendingUp },
  attention: { ring: "border-amber-500/40", bg: "bg-amber-500/[0.06]", text: "text-amber-500", bar: "bg-amber-500", label: "Atenção", Icon: TrendingDown },
  problem: { ring: "border-loss/45", bg: "bg-loss/[0.06]", text: "text-loss", bar: "bg-loss", label: "Ponto crítico", Icon: AlertTriangle },
  info: { ring: "border-accent-500/30", bg: "bg-accent-500/[0.05]", text: "text-accent-400", bar: "bg-accent-500", label: "Informação", Icon: Info },
} as const;

export function ConfidenceBadge({ level }: { level: "alta" | "média" | "baixa" }) {
  const dots = level === "alta" ? 3 : level === "média" ? 2 : 1;
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border hairline px-2 py-0.5 text-[11px] text-ink-300" title="Confiança da conclusão, pelo tamanho da amostra e pela consistência da mudança">
      <span className="flex gap-0.5">{[1, 2, 3].map((i) => <span key={i} className={cn("size-1.5 rounded-full", i <= dots ? "bg-accent-400" : "bg-ink-600")} />)}</span>
      Confiança {level}
    </span>
  );
}

export function LabLink({ href, children, q, className }: { href: string; children: React.ReactNode; q?: string; className?: string }) {
  return <Link href={href + (q ?? "")} className={cn("inline-flex items-center gap-1 text-sm font-semibold text-accent-400 hover:text-accent-300", className)}>{children}<ArrowRight className="size-3.5" /></Link>;
}

/** Full insight: evidence → interpretation → causes → recommendations → plan. */
export function InsightCard({ i, q = "", compact, canAct = true }: { i: Insight; q?: string; compact?: boolean; canAct?: boolean }) {
  const t = TONE[i.tone];
  return (
    <article className={cn("relative overflow-hidden rounded-xl border p-4 pl-5", t.ring, t.bg)}>
      <span aria-hidden className={cn("absolute inset-y-0 left-0 w-1", t.bar)} />
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <span className={cn("inline-flex items-center gap-1 font-display text-xs font-bold tracking-[0.12em] uppercase", t.text)}><t.Icon className="size-3.5" />{t.label}</span>
        {i.id !== "insufficient" && <ConfidenceBadge level={i.confidence} />}
      </div>
      <h3 className="font-display text-lg leading-snug font-bold text-ink-100">{i.title}</h3>
      <ul className="mt-2 space-y-1 text-sm text-ink-300">
        {i.evidence.map((e) => <li key={e} className="flex gap-2"><Database className="mt-0.5 size-3.5 shrink-0 text-ink-500" />{e}</li>)}
      </ul>
      {!compact && (
        <>
          <p className="mt-3 text-sm leading-relaxed text-ink-200">{i.interpretation}</p>
          {i.causes.length > 0 && (
            <div className="mt-3">
              <p className="kicker mb-1">Possíveis causas</p>
              <ul className="list-disc space-y-0.5 pl-5 text-sm text-ink-300">{i.causes.map((c) => <li key={c}>{c}</li>)}</ul>
            </div>
          )}
          {i.recommendations.length > 0 && (
            <div className="mt-3">
              <p className="kicker mb-1">Recomendações</p>
              <ul className="space-y-1 text-sm text-ink-200">{i.recommendations.map((c) => <li key={c} className="flex gap-2"><ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-accent-400" />{c}</li>)}</ul>
            </div>
          )}
        </>
      )}
      {i.topic && canAct && (
        <div className="mt-3 border-t pt-3 hairline">
          <LabLink href={`/app/lab/treinador/${i.topic}`} q={(q ? q + "&" : "?") + (i.variant ? `v=${i.variant}&` : "") + "origem=insight"}>Ver plano de desenvolvimento</LabLink>
        </div>
      )}
    </article>
  );
}

/** A metric value with its sample size; "—" + reason when there is not enough data. */
export function MetricCell({ def, v, strong }: { def: MetricDef; v: MetricValue; strong?: boolean }) {
  return (
    <span className="block text-right tabular-nums">
      <span className={cn("font-display", strong ? "text-xl font-bold text-ink-100" : "text-base font-semibold text-ink-200", v.value == null && "text-ink-500")}>{fmtMetric(def, v.value)}</span>
      <span className="block text-[10px] text-ink-500">{v.n ? `${v.n} j.` : "sem dados"}</span>
    </span>
  );
}

export function OriginTag({ origin }: { origin: MetricDef["origin"] }) {
  const map = { ea: "EA", "ea+manual": "EA / súmula", manual: "Súmula manual" } as const;
  return <span className="rounded border hairline px-1 py-px text-[9.5px] font-semibold tracking-wide text-ink-400 uppercase">{map[origin]}</span>;
}

/**
 * Minimal, readable line chart (server-rendered SVG). Gaps where the value is null.
 * A dashed line marks the player's career value when given.
 */
export function LineChart({ points, reference, format, height = 160, color = "#6f8fff", label }: {
  points: { value: number | null; label: string }[]; reference?: number | null; format: (v: number) => string; height?: number; color?: string; label: string;
}) {
  const vals = points.map((p) => p.value).filter((v): v is number => v != null);
  if (vals.length < 2) return <p className="py-6 text-center text-sm text-ink-400">Dados insuficientes para o gráfico.</p>;
  const all = reference != null ? [...vals, reference] : vals;
  let lo = Math.min(...all), hi = Math.max(...all);
  if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * 0.12; lo -= pad; hi += pad;
  const W = 600, H = height, L = 8, R = 8, T = 10, B = 18;
  const x = (i: number) => L + (i / Math.max(1, points.length - 1)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const segs: string[] = [];
  let cur = "";
  points.forEach((p, i) => {
    if (p.value == null) { if (cur) segs.push(cur); cur = ""; return; }
    cur += `${cur ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`;
  });
  if (cur) segs.push(cur);
  const lastIdx = points.map((p) => p.value).lastIndexOf(vals.at(-1)!);
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={label}>
        <defs><linearGradient id="lab-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={color} stopOpacity="0.25" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
        {[0.25, 0.5, 0.75].map((f) => <line key={f} x1={L} x2={W - R} y1={T + f * (H - T - B)} y2={T + f * (H - T - B)} stroke="var(--line)" strokeWidth="1" />)}
        {reference != null && <line x1={L} x2={W - R} y1={y(reference)} y2={y(reference)} stroke="var(--ink-400)" strokeDasharray="4 4" strokeWidth="1" />}
        {segs.map((d, k) => <path key={k} d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />)}
        {points.map((p, i) => p.value != null && <circle key={i} cx={x(i)} cy={y(p.value)} r={i === lastIdx ? 4.5 : 2.5} fill={i === lastIdx ? "#fff" : color} stroke={color} strokeWidth="2"><title>{`${p.label}: ${format(p.value)}`}</title></circle>)}
        <text x={L} y={H - 4} fontSize="11" fill="var(--ink-400)">{points[0].label}</text>
        <text x={W - R} y={H - 4} fontSize="11" fill="var(--ink-400)" textAnchor="end">{points.at(-1)!.label}</text>
      </svg>
      <figcaption className="mt-1 flex flex-wrap justify-between gap-2 text-[11px] text-ink-400">
        <span>Atual: <b className="text-ink-200">{format(vals.at(-1)!)}</b> · mín. {format(Math.min(...vals))} · máx. {format(Math.max(...vals))}</span>
        {reference != null && <span>- - - histórico: {format(reference)}</span>}
      </figcaption>
    </figure>
  );
}

export function SourceNote({ sources, period, children }: { sources: { ea: number; manual: number }; period: { from: Date; to: Date } | null; children?: React.ReactNode }) {
  const f = (d: Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "2-digit" }).format(d);
  return (
    <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-ink-400">
      <span className="inline-flex items-center gap-1"><Database className="size-3" />Período: {period ? `${f(period.from)} a ${f(period.to)}` : "sem partidas"}</span>
      <span>Fonte: {sources.ea} partida(s) da EA{sources.manual ? ` · ${sources.manual} da súmula manual` : ""}</span>
      {children}
    </p>
  );
}
