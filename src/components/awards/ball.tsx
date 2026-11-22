import { cn } from "@/lib/cn";

/** Metallic ball emblem — gold for Bola de Ouro, silver for Bola de Prata (pure CSS). */
export function Ball({ kind, size = 56, className }: { kind: "gold" | "silver"; size?: number; className?: string }) {
  const bg = kind === "gold"
    ? "radial-gradient(circle at 32% 28%, #fff6d6 0%, #f2cf63 22%, #c9952c 55%, #7a5512 100%)"
    : "radial-gradient(circle at 32% 28%, #ffffff 0%, #e3e8f0 22%, #a9b3c4 55%, #5b6577 100%)";
  return (
    <span aria-hidden className={cn("relative inline-block shrink-0 rounded-full", className)}
      style={{ width: size, height: size, background: bg, boxShadow: `0 ${size / 10}px ${size / 3}px -${size / 8}px ${kind === "gold" ? "rgb(201 149 44 / 0.7)" : "rgb(91 101 119 / 0.7)"}, inset 0 -${size / 12}px ${size / 6}px rgb(0 0 0 / 0.25)` }}>
      {/* panel seams */}
      <svg viewBox="0 0 100 100" className="absolute inset-0 opacity-35">
        <g fill="none" stroke="#000" strokeWidth="2.2">
          <polygon points="50,30 66,42 60,61 40,61 34,42" />
          <path d="M50 30 L50 8 M66 42 L86 34 M60 61 L72 80 M40 61 L28 80 M34 42 L14 34" />
        </g>
      </svg>
    </span>
  );
}
