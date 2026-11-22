"use client";
import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const KEY = "ascend_splash_seen";

/**
 * Opening screen once per app session: the crest, then the player's shirt number.
 * Never blocks taps (pointer-events: none) and is skipped with "reduce motion".
 */
export function Splash({ number }: { number: number | null }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    let seen = "1";
    try { seen = sessionStorage.getItem(KEY) ?? ""; sessionStorage.setItem(KEY, "1"); } catch { /* ignore */ }
    if (seen || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const on = setTimeout(() => setShow(true), 0);
    const off = setTimeout(() => setShow(false), number != null ? 1700 : 1200);
    return () => { clearTimeout(on); clearTimeout(off); };
  }, [number]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          aria-hidden
          className="pointer-events-none fixed inset-0 z-[80] grid place-items-center overflow-hidden"
          style={{ background: "linear-gradient(160deg,#15318a 0%,#0c1d4f 40%,#04060b 85%)" }}
          initial={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.04 }} transition={{ duration: 0.35 }}
        >
          {number != null && (
            <motion.span
              className="absolute font-display font-bold leading-none text-transparent"
              style={{ fontSize: "70vmin", WebkitTextStroke: "3px rgb(255 255 255 / 0.18)" }}
              initial={{ opacity: 0, scale: 1.4 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.45, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >{number}</motion.span>
          )}
          <div className="relative flex flex-col items-center">
            <motion.img src="/brand/generated/crest-clear-256.png" alt="" width={170} height={170} className="drop-shadow-[0_16px_36px_rgb(0_0_0/0.6)]"
              initial={{ opacity: 0, scale: 0.7, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }} />
            <motion.p className="mt-5 font-display text-sm font-semibold tracking-[0.45em] text-[#c9d1dc]"
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }}>RISE. CONQUER. ASCEND.</motion.p>
            {number != null && (
              <motion.p className="mt-2 font-display text-lg font-bold tracking-[0.3em] text-white"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }}>CAMISA {number}</motion.p>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
