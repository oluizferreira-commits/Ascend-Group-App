/** A light beam travelling around the parent's border (parent needs `relative overflow-hidden rounded-*`). */
export function BorderBeam({ duration = 9, color = "#6f8fff", iterations = 2 }: { duration?: number; color?: string; iterations?: number | "infinite" }) {
  return (
    <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] p-px motion-reduce:hidden"
      style={{
        WebkitMask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
        mask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
      }}>
      <span className="absolute inset-[-100%]"
        style={{ animation: `beam-spin ${duration}s linear ${iterations} forwards`, opacity: 1, background: `conic-gradient(from 0deg, transparent 0 78%, ${color} 88%, #fff 90%, transparent 92%)` }} />
    </span>
  );
}
