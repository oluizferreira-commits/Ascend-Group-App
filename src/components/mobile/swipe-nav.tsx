"use client";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

const IGNORE = "input, textarea, select, [contenteditable], [data-no-swipe], .touch-none, [draggable=true], [role=dialog]";

function insideHorizontalScroller(el: Element | null) {
  for (let n = el; n && n !== document.body; n = n.parentElement) {
    const s = getComputedStyle(n);
    if ((s.overflowX === "auto" || s.overflowX === "scroll") && n.scrollWidth > n.clientWidth + 2) return true;
  }
  return false;
}

/** Swipe left/right on the page to move between the bottom-bar tabs (touch screens only). */
export function SwipeNav({ tabs }: { tabs: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    let sx = 0, sy = 0, st = 0, ok = false;
    const start = (e: TouchEvent) => {
      const t = e.touches[0];
      const target = e.target as Element;
      ok = e.touches.length === 1 && !target.closest(IGNORE) && !insideHorizontalScroller(target);
      sx = t.clientX; sy = t.clientY; st = Date.now();
    };
    const end = (e: TouchEvent) => {
      if (!ok) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - sx, dy = t.clientY - sy;
      if (Date.now() - st > 600 || Math.abs(dx) < 90 || Math.abs(dy) > 45) return;
      const current = tabs.findIndex((h) => (h === "/app" ? pathname === "/app" : pathname === h || pathname.startsWith(h + "/")));
      if (current < 0) return;
      const next = tabs[current + (dx < 0 ? 1 : -1)];
      if (next) { navigator.vibrate?.(8); router.push(next); }
    };
    window.addEventListener("touchstart", start, { passive: true });
    window.addEventListener("touchend", end, { passive: true });
    return () => { window.removeEventListener("touchstart", start); window.removeEventListener("touchend", end); };
  }, [tabs, pathname, router]);
  return null;
}
