/** Minimal accessible line chart of rating evolution (0–10 scale). */
export function RatingTrend({ points }: { points: { label: string; value: number }[] }) {
  if (points.length < 2) return <p className="py-6 text-center text-sm text-ink-400">São necessárias ao menos 2 partidas para exibir a evolução.</p>;
  const W = 600, H = 160, P = 24;
  const x = (i: number) => P + (i * (W - 2 * P)) / (points.length - 1);
  const y = (v: number) => H - P - (v / 10) * (H - 2 * P);
  const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join(" ");
  const avg = points.reduce((a, p) => a + p.value, 0) / points.length;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-40 w-full" role="img" aria-label={`Evolução da nota em ${points.length} partidas, média ${avg.toFixed(1)}`}>
      <defs>
        <linearGradient id="trendFill" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#c9a24a" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#c9a24a" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[2, 4, 6, 8, 10].map((v) => (
        <g key={v}>
          <line x1={P} x2={W - P} y1={y(v)} y2={y(v)} stroke="#24242d" strokeWidth="1" />
          <text x={4} y={y(v) + 4} fontSize="10" fill="#8a8a96">{v}</text>
        </g>
      ))}
      <line x1={P} x2={W - P} y1={y(avg)} y2={y(avg)} stroke="#741430" strokeDasharray="4 4" />
      <path d={`${d} L${x(points.length - 1)},${H - P} L${x(0)},${H - P} Z`} fill="url(#trendFill)" />
      <path d={d} fill="none" stroke="#e2c06a" strokeWidth="2" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={x(i)} cy={y(p.value)} r="3" fill="#07070a" stroke="#e2c06a" strokeWidth="1.5">
          <title>{`${p.label}: ${p.value.toFixed(1)}`}</title>
        </circle>
      ))}
    </svg>
  );
}
