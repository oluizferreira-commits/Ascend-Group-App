"use client";
import { motion } from "motion/react";
import { ATTRIBUTES, type AttributeKey, type Attributes } from "@/lib/attributes";

const KEYS = Object.keys(ATTRIBUTES) as AttributeKey[];

/** Two overlaid hexagonal radars (30–99 scale). Missing attributes are drawn at the centre and marked. */
export function CompareRadar({ a, b, nameA, nameB }: { a: Attributes; b: Attributes; nameA: string; nameB: string }) {
  const S = 320, C = S / 2, R = 118;
  const pt = (i: number, v: number) => {
    const ang = -Math.PI / 2 + (i * 2 * Math.PI) / KEYS.length;
    const r = (Math.max(0, v - 30) / 69) * R;
    return [C + r * Math.cos(ang), C + r * Math.sin(ang)] as const;
  };
  const poly = (x: Attributes) => KEYS.map((k, i) => pt(i, x[k] ?? 30).join(",")).join(" ");
  return (
    <figure className="flex flex-col items-center">
      <svg viewBox={`0 0 ${S} ${S}`} className="w-full max-w-[340px]" role="img" aria-label={`Radar de atributos: ${nameA} contra ${nameB}`}>
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <polygon key={f} points={KEYS.map((_, i) => { const ang = -Math.PI / 2 + (i * 2 * Math.PI) / KEYS.length; return `${C + f * R * Math.cos(ang)},${C + f * R * Math.sin(ang)}`; }).join(" ")}
            fill="none" stroke="var(--ink-700)" strokeWidth="1" />
        ))}
        {KEYS.map((k, i) => {
          const [x, y] = pt(i, 99);
          const [lx, ly] = [C + (x - C) * 1.18, C + (y - C) * 1.18];
          return (
            <g key={k}>
              <line x1={C} y1={C} x2={x} y2={y} stroke="var(--ink-700)" strokeWidth="1" />
              <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle" className="fill-[var(--ink-300)] font-display text-[13px] font-bold tracking-wider">{k}</text>
            </g>
          );
        })}
        <motion.polygon points={poly(b)} fill="color-mix(in oklab, var(--ink-300) 18%, transparent)" stroke="var(--ink-300)" strokeWidth="2" strokeDasharray="5 4"
          initial={{ opacity: 0, scale: 0.6 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} style={{ transformOrigin: "50% 50%" }} transition={{ duration: 0.7, delay: 0.15 }} />
        <motion.polygon points={poly(a)} fill="color-mix(in oklab, var(--accent-500) 30%, transparent)" stroke="var(--accent-500)" strokeWidth="2.5"
          initial={{ opacity: 0, scale: 0.6 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} style={{ transformOrigin: "50% 50%" }} transition={{ duration: 0.7 }} />
      </svg>
      <figcaption className="mt-2 flex flex-wrap justify-center gap-4 text-sm">
        <span className="flex items-center gap-2"><span className="h-1 w-6 rounded bg-accent-500" />{nameA}</span>
        <span className="flex items-center gap-2"><span className="h-0 w-6 border-t-2 border-dashed border-ink-300" />{nameB}</span>
      </figcaption>
    </figure>
  );
}
