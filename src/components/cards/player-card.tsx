"use client";
import { useRef } from "react";
import { cn } from "@/lib/cn";
import { ATTRIBUTES, CARD_ATTRS, cardTier, type AttributeKey, type Attributes } from "@/lib/attributes";
import { POSITION_LABELS, type Position } from "@/lib/domain";

export type PlayerCardProps = {
  nickname: string;
  position: Position;
  shirtNumber: number | null;
  avatarUrl: string | null;
  /** Photo framing: focus point in % (object-position) and zoom (100 = fit). */
  photoX?: number;
  photoY?: number;
  photoZoom?: number;
  ovr: number | null;
  ovrSource: "ea" | "rating" | null;
  attributes: Attributes;
  seasonLabel?: string;
  size?: "sm" | "md" | "lg";
  tilt?: boolean;
  highlight?: Partial<Record<AttributeKey, boolean>>;
};


const TIERS = {
  lenda: { rim: "#bcd0ff", glow: "rgba(111,143,255,0.75)", metal: "linear-gradient(160deg,#ffffff 0%,#c9d1dc 18%,#7d8aa3 38%,#f4f7ff 52%,#8f9bb3 70%,#e6ecfd 100%)", label: "Lenda" },
  ascend: { rim: "#8fa9ff", glow: "rgba(58,99,240,0.6)", metal: "linear-gradient(160deg,#e6ecfd 0%,#9aa6bd 25%,#56627a 45%,#d5dceb 60%,#6d7891 80%,#c9d1dc 100%)", label: "Ascend" },
  base: { rim: "#5a6f9e", glow: "rgba(28,63,176,0.45)", metal: "linear-gradient(160deg,#9aa6bd 0%,#4a5672 35%,#7d8aa3 55%,#3a4560 80%,#8b96ad 100%)", label: "Base" },
} as const;

const SIZES = { sm: 180, md: 250, lg: 320 } as const;
// Shield silhouette (echoes the club crest): peaked top, angled shoulders, pointed base.
const SHIELD = "polygon(50% 0%, 93% 3.2%, 100% 9.5%, 100% 83%, 50% 100%, 0% 83%, 0% 9.5%, 7% 3.2%)";

/** Font size that keeps long names on one line (≈ 10 chars at full size). */
function nameSize(name: string) {
  const len = [...name].length;
  return Math.max(13, Math.min(27, 27 * (10 / Math.max(10, len))));
}

/**
 * Ascend CF player card — our own FUT-inspired design: shield shape, silver metallic rim,
 * blue rim light, cut-out player that fades into the card, crest, number watermark and six
 * stat attributes. Every value comes from props (real player data). Scales fluidly to any width.
 */
export function PlayerCard(p: PlayerCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const tier = cardTier(p.ovr);
  const t = TIERS[tier];
  const w = SIZES[p.size ?? "md"];
  const u = (n: number) => `calc(${n} * 100cqw / 250)`;
  const ovrText = p.ovr == null ? "—" : String(p.ovr);
  const ovrSize = ovrText.length >= 3 ? 40 : 54;
  const x = p.photoX ?? 50, y = p.photoY ?? 20, zoom = (p.photoZoom ?? 100) / 100;

  const onMove = (e: React.PointerEvent) => {
    if (!p.tilt || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.setProperty("--rx", `${(-py * 14).toFixed(2)}deg`);
    ref.current.style.setProperty("--ry", `${(px * 18).toFixed(2)}deg`);
    ref.current.style.setProperty("--gx", `${((px + 0.5) * 100).toFixed(1)}%`);
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
            aspectRatio: "250 / 352",
            transform: "rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))",
            transformStyle: "preserve-3d",
            filter: `drop-shadow(0 ${u(14)} ${u(22)} rgb(2 6 23 / 0.55)) drop-shadow(0 0 ${u(10)} ${t.glow})`,
          }}
          role="img"
          aria-label={`Carta de ${p.nickname}: ${p.ovr ?? "sem nota"} geral, ${POSITION_LABELS[p.position]}${p.shirtNumber != null ? `, camisa ${p.shirtNumber}` : ""}`}
        >
          {/* metallic rim */}
          <div className="absolute inset-0" style={{ clipPath: SHIELD, background: t.metal }} />
          {/* card body */}
          <div
            className="absolute overflow-hidden text-white"
            style={{
              inset: u(4.5),
              clipPath: SHIELD,
              background: [
                `radial-gradient(120% 70% at 62% 30%, ${t.glow} 0%, transparent 55%)`,
                "radial-gradient(90% 50% at 50% 110%, rgba(28,63,176,0.55) 0%, transparent 70%)",
                "repeating-linear-gradient(115deg, transparent 0 18px, rgba(255,255,255,0.025) 18px 19px)",
                "linear-gradient(180deg,#0c1d4f 0%,#081236 38%,#04060b 78%)",
              ].join(","),
            }}
          >
            {/* light beams */}
            <span aria-hidden className="absolute inset-0" style={{ background: "linear-gradient(105deg, transparent 38%, rgba(143,169,255,0.10) 44%, transparent 50%), linear-gradient(105deg, transparent 58%, rgba(143,169,255,0.07) 62%, transparent 66%)" }} />
            {/* shirt number watermark */}
            {p.shirtNumber != null && (
              <span aria-hidden className="absolute font-display leading-none font-bold" style={{ right: u(-4), top: u(22), fontSize: u(150), color: "transparent", WebkitTextStroke: `${u(1.2)} rgba(201,209,220,0.16)` }}>
                {p.shirtNumber}
              </span>
            )}
            {/* rim light behind the player */}
            <span aria-hidden className="absolute rounded-full" style={{ left: u(70), top: u(40), width: u(170), height: u(170), background: `radial-gradient(circle, ${t.glow} 0%, transparent 65%)`, filter: `blur(${u(6)})` }} />

            {/* player photo (cut-out PNG preferred) — cover + configurable focus, fades into the card */}
            <div className="absolute" style={{ left: u(52), right: u(0), top: u(12), height: u(184), WebkitMaskImage: "linear-gradient(180deg,#000 62%,transparent 98%)", maskImage: "linear-gradient(180deg,#000 62%,transparent 98%)" }}>
              {p.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.avatarUrl} alt="" draggable={false} className="h-full w-full object-cover"
                  style={{ objectPosition: `${x}% ${y}%`, transform: `scale(${zoom})`, transformOrigin: `${x}% ${y}%`, filter: "drop-shadow(0 0 6px rgba(111,143,255,0.35)) contrast(1.05) saturate(1.05)" }} />
              ) : (
                <div className="grid h-full w-full place-items-center font-display font-bold" style={{ fontSize: u(84), color: "rgba(201,214,255,0.85)", textShadow: `0 0 ${u(12)} ${t.glow}` }}>
                  {p.shirtNumber ?? p.nickname.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>

            {/* left column: overall, position, crest, number */}
            <div className="absolute flex flex-col items-center font-display font-bold leading-none" style={{ left: u(14), top: u(26), width: u(56) }}>
              <span className="tabular-nums" style={{ fontSize: u(ovrSize), textShadow: `0 ${u(2)} ${u(8)} rgba(0,0,0,0.6)` }}>{ovrText}</span>
              <span style={{ fontSize: u(19), color: t.rim, letterSpacing: "0.06em", marginTop: u(2) }}>{POSITION_LABELS[p.position]}</span>
              <span aria-hidden style={{ width: u(30), height: u(1.5), background: t.metal, margin: `${u(7)} 0` }} />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/generated/crest-128.png" alt="" draggable={false} style={{ width: u(30), height: "auto", filter: `drop-shadow(0 0 ${u(4)} ${t.glow})` }} />
              {p.shirtNumber != null && <span className="tabular-nums" style={{ fontSize: u(15), marginTop: u(8), color: "#dbe4ff" }}>#{p.shirtNumber}</span>}
            </div>

            {/* name */}
            <div className="absolute inset-x-0 text-center" style={{ top: u(183) }}>
              <span className="block truncate px-[8%] font-display font-bold uppercase"
                style={{ fontSize: u(nameSize(p.nickname)), letterSpacing: "0.05em", background: "linear-gradient(180deg,#ffffff 20%,#c9d1dc 60%,#8b96ad 100%)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", lineHeight: 1.15 }}>
                {p.nickname}
              </span>
              <span aria-hidden className="mx-auto mt-1 block" style={{ height: u(1.5), width: "74%", background: `linear-gradient(90deg, transparent, ${t.rim}, transparent)` }} />
            </div>

            {/* attributes: FIN DEC DEF / CRI PAS REG */}
            <div className="absolute grid grid-cols-3 font-display" style={{ top: u(222), left: u(26), right: u(26), rowGap: u(6), columnGap: u(6) }}>
              {CARD_ATTRS.map((k) => (
                <div key={k} className="flex flex-col items-center leading-none" title={`${ATTRIBUTES[k].label}: ${ATTRIBUTES[k].hint}`}>
                  <span className={cn("font-bold tabular-nums", p.highlight?.[k] && "underline decoration-2 underline-offset-2")} style={{ fontSize: u(20) }}>{p.attributes[k] ?? "—"}</span>
                  <span style={{ fontSize: u(10.5), color: t.rim, letterSpacing: "0.14em", marginTop: u(2) }}>{k}</span>
                </div>
              ))}
            </div>

            {/* footer */}
            <div className="absolute inset-x-0 flex flex-col items-center font-display uppercase" style={{ bottom: u(16), gap: u(2) }}>
              <span style={{ fontSize: u(9), letterSpacing: "0.32em", color: "#c9d1dc" }}>Ascend CF</span>
              {p.seasonLabel && <span className="max-w-[70%] truncate" style={{ fontSize: u(7), letterSpacing: "0.22em", color: "rgba(201,209,220,0.6)" }}>{p.seasonLabel}</span>}
            </div>

            {/* holographic sheen for the top tier */}
            {tier === "lenda" && (
              <span aria-hidden className="absolute inset-0 mix-blend-overlay motion-safe:animate-[holo_5s_ease-in-out_3]"
                style={{ background: "linear-gradient(115deg,transparent 20%,rgba(255,255,255,0.45) 40%,rgba(111,143,255,0.3) 50%,transparent 70%)", backgroundSize: "250% 100%" }} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
