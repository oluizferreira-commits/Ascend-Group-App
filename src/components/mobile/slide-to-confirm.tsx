"use client";
import { useRef, useState } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { ChevronsRight } from "lucide-react";

/**
 * "Deslize para confirmar" — a deliberate gesture for important answers. Fully accessible:
 * the thumb is a button, so tap/Enter also confirms.
 */
export function SlideToConfirm({ label, onConfirm, disabled }: { label: string; onConfirm: () => void; disabled?: boolean }) {
  const track = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [done, setDone] = useState(false);
  const fade = useTransform(x, [0, 140], [1, 0]);
  const confirm = () => { if (done || disabled) return; setDone(true); navigator.vibrate?.(20); onConfirm(); };
  return (
    <div ref={track} className="relative h-14 w-full max-w-xs overflow-hidden rounded-full bg-white/15 select-none">
      <motion.span style={{ opacity: fade }} className="pointer-events-none absolute inset-0 grid place-items-center pl-10 font-display text-sm font-bold tracking-[0.18em] text-white uppercase">
        {label}
      </motion.span>
      <motion.button
        type="button"
        aria-label={label}
        disabled={disabled || done}
        onClick={confirm}
        drag="x"
        dragConstraints={track}
        dragElastic={0}
        dragMomentum={false}
        style={{ x }}
        onDragEnd={() => {
          const max = (track.current?.offsetWidth ?? 240) - 56;
          if (x.get() > max * 0.75) { animate(x, max, { duration: 0.15 }); confirm(); }
          else animate(x, 0, { type: "spring", stiffness: 500, damping: 30 });
        }}
        className="absolute top-1 left-1 grid size-12 touch-none place-items-center rounded-full bg-white text-[#0c1d4f] shadow-lg"
      >
        <ChevronsRight className="size-6" />
      </motion.button>
    </div>
  );
}
