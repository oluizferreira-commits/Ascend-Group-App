"use client";
import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" }).then((r) => r.update()).catch(() => {});
    }
  }, []);
  return null;
}

/**
 * Native-app feel: blocks pinch/double-tap zoom (iOS ignores user-scalable=no)
 * and the long-press link/image preview & context menu. Inputs keep working.
 */
export function AppTouchGuards() {
  useEffect(() => {
    const stop = (e: Event) => e.preventDefault();
    // iOS Safari pinch gestures
    document.addEventListener("gesturestart", stop, { passive: false });
    document.addEventListener("gesturechange", stop, { passive: false });
    // multi-touch pinch on other browsers
    const onTouchMove = (e: TouchEvent) => { if (e.touches.length > 1) e.preventDefault(); };
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    // long-press / right-click menu on links, buttons and images (Android shows it via contextmenu)
    const onContext = (e: Event) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("a, img, button, [role=button], svg")) e.preventDefault();
    };
    document.addEventListener("contextmenu", onContext);
    return () => {
      document.removeEventListener("gesturestart", stop);
      document.removeEventListener("gesturechange", stop);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("contextmenu", onContext);
    };
  }, []);
  return null;
}
