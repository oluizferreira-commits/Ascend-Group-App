"use client";
import { useRef } from "react";
import { cn } from "@/lib/cn";
import { ATTRIBUTES, cardTier, type AttributeKey, type Attributes } from "@/lib/attributes";
import { POSITION_LABELS, type Position } from "@/lib/domain";

export type PlayerCardProps = {
  nickname: string;
  position: Position;
  shirtNumber: number | null;
  avatarUrl: string | null;
  ovr: number | null;
  ovrSource: "ea" | "rating" | null;
  attributes: Attributes;
  seasonLabel?: string;
  size?: "sm" | "md" | "lg";
  tilt?: boolean;
  highlight?: Partial<Record<AttributeKey, boolean>>;
};

const TIERS = {
  lenda: {
    bg: "linear-gradient(155deg,#8fa9ff 0%,#3a63f0 22%,#1c3fb0 48%,#0c1d4f 75%,#04060b 100%)",
    ink: "#ffffff", sub: "#e6ecfd", line: "rgba(255,255,255,0.4)",
  },
  ascend: {
    bg: "linear-gradient(155deg,#3a63f0 0%,#1c3fb0 40%,#0c1d4f 100%)",
    ink: "#ffffff", sub: "#c9d6ff", line: "rgba(255,255,255,0.25)",
  },
  base: {
    bg: "linear-gradient(155deg,#1d2638 0%,#0e1320 55%,#04060b 100%)",
    ink: "#f1f4f9", sub: "#9db4ff", line: "rgba(255,255,255,0.15)",
  },
} as const;

const SIZES = { sm: 180, md: 250, lg: 320 } as const;

/** FUT-style player card. Pointer drag tilts it in 3D; "Lenda" tier gets a holographic sheen. */
export function PlayerCard(p: PlayerCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const tier = cardTier(p.ovr);
  const t = TIERS[tier];
  const w = SIZES[p.size ?? "md"];
  // Fluid unit: 1/250 of the card's rendered width, so the card scales to any column (container query units).
  const u = (n: number) => `calc(${n} * 100cqw / 250)`;
  const onMove = (e: React.PointerEvent) => {
    if (!p.tilt || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5, y = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.setProperty("--rx", `${(-y * 14).toFixed(2)}deg`);
    ref.current.style.setProperty("--ry", `${(x * 18).toFixed(2)}deg`);
    ref.current.style.setProperty("--gx", `${((x + 0.5) * 100).toFixed(1)}%`);
  };
  const reset = () => {
    ref.current?.style.setProperty("--rx", "0deg");
    ref.current?.style.setProperty("--ry", "0deg");
  };

  return (
    <div className="[perspective:900px]" style={{ width: w, maxWidth: "100%" }}>
      <div style={{ containerType: "inline-size" }}>
      <div
        ref={ref}
        onPointerMove={onMove}
        onPointerLeave={reset}
        onPointerUp={reset}
        className={cn("relative select-none transition-transform duration-200 ease-out will-change-transform", p.tilt && "touch-none")}
        style={{
          aspectRatio: "250 / 350",
          transform: "rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))",
          transformStyle: "preserve-3d",
          filter: "drop-shadow(0 18px 30px rgb(4 10 40 / 0.45))",
        }}
        role="img"
        aria-label={`Carta de ${p.nickname}: ${p.ovr ?? "sem nota"} geral, ${POSITION_LABELS[p.position]}`}
      >
        <div
          className="absolute inset-0 overflow-hidden"
          style={{ background: t.bg, clipPath: "polygon(50% 0, 100% 7%, 100% 86%, 50% 100%, 0 86%, 0 7%)", color: t.ink }}
        >
          {p.shirtNumber != null && (
            <span aria-hidden className="absolute font-display font-bold leading-none"
              style={{ right: u(-6), top: u(70), fontSize: u(190), color: "transparent", WebkitTextStroke: `${u(1.5)} ${t.line}` }}>
              {p.shirtNumber}
            </span>
          )}
          {tier === "lenda" && (
            <span aria-hidden className="absolute inset-0 mix-blend-overlay motion-safe:animate-[holo_5s_ease-in-out_3]"
              style={{ background: "linear-gradient(115deg,transparent 20%,rgba(255,255,255,0.55) 40%,rgba(111,143,255,0.35) 50%,transparent 70%)", backgroundSize: "250% 100%" }} />
          )}
          <div className="absolute flex flex-col items-center font-display font-bold leading-none" style={{ left: u(22), top: u(34) }}>
            <span style={{ fontSize: u(52) }}>{p.ovr ?? "—"}</span>
            <span style={{ fontSize: u(20), color: t.sub, letterSpacing: "0.06em" }}>{POSITION_LABELS[p.position]}</span>
            {p.shirtNumber != null && <span style={{ fontSize: u(15), marginTop: u(6), opacity: 0.85 }}>#{p.shirtNumber}</span>}
          </div>
          <div className="absolute overflow-hidden" style={{ right: u(18), top: u(30), width: u(140), height: u(140), borderRadius: u(12) }}>
            {p.avatarUrl
              ? // eslint-disable-next-line @next/next/no-img-element
                <img src={p.avatarUrl} alt="" draggable={false} className="h-full w-full object-cover" />
              : <div className="grid h-full w-full place-items-center font-display font-bold" style={{ fontSize: u(64), color: t.sub, background: "rgb(255 255 255 / 0.06)" }}>
                  {p.shirtNumber ?? p.nickname.slice(0, 2).toUpperCase()}
                </div>}
          </div>
          <div className="absolute inset-x-0 text-center font-display font-bold uppercase" style={{ top: u(182), fontSize: u(26), letterSpacing: "0.04em" }}>
            <span className="block truncate px-4">{p.nickname}</span>
            <span className="mx-auto mt-1 block" style={{ height: 1, width: "70%", background: t.line }} />
          </div>
          <div className="absolute grid grid-cols-2 font-display" style={{ top: u(226), left: u(34), right: u(34), columnGap: u(18), rowGap: u(2) }}>
            {(Object.keys(ATTRIBUTES) as AttributeKey[]).map((k) => (
              <div key={k} className="flex items-baseline gap-1.5" title={`${ATTRIBUTES[k].label}: ${ATTRIBUTES[k].hint}`}>
                <span className={cn("font-bold tabular-nums", p.highlight?.[k] && "underline decoration-2 underline-offset-2")} style={{ fontSize: u(19), minWidth: u(24) }}>
                  {p.attributes[k] ?? "—"}
                </span>
                <span style={{ fontSize: u(14), color: t.sub, letterSpacing: "0.08em" }}>{k}</span>
              </div>
            ))}
          </div>
          {p.seasonLabel && (
            <div className="absolute inset-x-0 text-center font-display uppercase" style={{ bottom: u(26), fontSize: u(10), letterSpacing: "0.3em", color: t.sub }}>
              {p.seasonLabel}
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
