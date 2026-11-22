"use client";
import { motion } from "motion/react";

/** Animated circular percentage (e.g. aproveitamento). */
export function ProgressRing({ value, size = 64, stroke = 6, label }: { value: number | null; size?: number; stroke?: number; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value ?? 0));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label ?? `${pct.toFixed(1)}%`} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ink-700)" strokeWidth={stroke} />
      <motion.circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--accent-500)" strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c} initial={{ strokeDashoffset: c }} whileInView={{ strokeDashoffset: c * (1 - pct / 100) }}
        viewport={{ once: true }} transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }} />
    </svg>
  );
}
