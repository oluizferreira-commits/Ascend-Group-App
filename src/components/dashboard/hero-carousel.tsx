"use client";
import { Children, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/** Horizontal, swipeable hero banners (CSS scroll-snap) with position dots. */
export function HeroCarousel({ children, label = "Destaques" }: { children: React.ReactNode; label?: string }) {
  const slides = Children.toArray(children);
  const ref = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const onScroll = () => {
    const el = ref.current;
    if (el) setIdx(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)));
  };
  const go = (i: number) => ref.current?.scrollTo({ left: i * ref.current.clientWidth, behavior: "smooth" });
  return (
    <section aria-roledescription="carrossel" aria-label={label}>
      <div ref={ref} onScroll={onScroll} data-no-swipe
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {slides.map((s, i) => (
          <div key={i} className="w-full shrink-0 snap-center" aria-roledescription="slide" aria-label={`${i + 1} de ${slides.length}`}>{s}</div>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="mt-2.5 flex justify-center gap-1.5">
          {slides.map((_, i) => (
            <button key={i} type="button" onClick={() => go(i)} aria-label={`Ir para o destaque ${i + 1}`}
              className={cn("h-1 rounded-full transition-all duration-300", i === idx ? "w-6 bg-accent-400" : "w-3 bg-ink-600")} />
          ))}
        </div>
      )}
    </section>
  );
}
