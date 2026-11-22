"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { RefreshCw } from "lucide-react";

const THRESHOLD = 72;

/** Native-feeling pull-to-refresh for touch screens (installed PWAs have none on iOS). */
export function PullToRefresh() {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [pending, startTransition] = useTransition();
  const start = useRef<number | null>(null);

  useEffect(() => {
    const onStart = (e: TouchEvent) => {
      start.current = window.scrollY <= 0 && e.touches.length === 1 ? e.touches[0].clientY : null;
    };
    const onMove = (e: TouchEvent) => {
      if (start.current == null) return;
      const dy = e.touches[0].clientY - start.current;
      if (dy > 0 && window.scrollY <= 0) setPull(Math.min(120, dy * 0.5));
      else setPull(0);
    };
    const onEnd = () => {
      setPull((p) => {
        if (p >= THRESHOLD) {
          navigator.vibrate?.(10);
          startTransition(() => router.refresh());
        }
        return 0;
      });
      start.current = null;
    };
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchmove", onMove, { passive: true });
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [router]);

  const visible = pull > 4 || pending;
  if (!visible) return null;
  const progress = Math.min(1, pull / THRESHOLD);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40 flex justify-center lg:hidden"
      style={{ transform: `translateY(${pending ? 72 : pull}px)`, transition: pull ? "none" : "transform 200ms ease" }}>
      <div className="glass mt-2 grid size-10 place-items-center rounded-full" aria-live="polite" aria-label={pending ? "Atualizando" : "Solte para atualizar"}>
        <RefreshCw className={pending ? "size-5 animate-spin text-accent-400" : "size-5 text-accent-400"}
          style={pending ? undefined : { transform: `rotate(${progress * 270}deg)`, opacity: 0.4 + progress * 0.6 }} />
      </div>
    </div>
  );
}
