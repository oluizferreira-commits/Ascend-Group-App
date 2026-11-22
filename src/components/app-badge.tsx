"use client";
import { useEffect } from "react";

type BadgeNavigator = Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };

/** Unread count on the installed app icon (Android, iOS 16.4+ home-screen apps, desktop PWAs). */
export function AppBadge({ count }: { count: number }) {
  useEffect(() => {
    const nav = navigator as BadgeNavigator;
    if (!nav.setAppBadge) return;
    (count > 0 ? nav.setAppBadge(count) : nav.clearAppBadge?.())?.catch(() => {});
  }, [count]);
  return null;
}
