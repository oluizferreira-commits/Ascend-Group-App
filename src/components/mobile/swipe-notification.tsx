"use client";
import Link from "next/link";
import { useState, useTransition } from "react";
import { animate, motion, useMotionValue, useTransform } from "motion/react";
import { Check } from "lucide-react";
import { markReadAction } from "@/server/actions/notifications";
import { cn } from "@/lib/cn";

/** Notification row — swipe left to mark as read (also a button for mouse/keyboard). */
export function SwipeNotification({ id, title, body, when, link, read }: { id: string; title: string; body: string | null; when: string; link: string | null; read: boolean }) {
  const [isRead, setRead] = useState(read);
  const [, start] = useTransition();
  const x = useMotionValue(0);
  const reveal = useTransform(x, [-120, -30, 0], [1, 0.4, 0]);
  const markRead = () => { if (isRead) return; setRead(true); navigator.vibrate?.(10); start(() => markReadAction(id)); };
  const inner = (
    <div className="flex gap-3 px-4 py-3">
      <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", isRead ? "bg-transparent" : "bg-accent-400")} />
      <div className="min-w-0 flex-1">
        <p className={cn("text-sm", !isRead && "font-semibold")}>{title}</p>
        {body && <p className="text-sm text-ink-400">{body}</p>}
        <p className="mt-0.5 text-xs text-ink-400">{when}</p>
      </div>
    </div>
  );
  return (
    <li className="relative overflow-hidden" data-no-swipe>
      <motion.div style={{ opacity: reveal }} className="absolute inset-0 flex items-center justify-end bg-accent-500 px-5 font-semibold text-white">
        <Check className="mr-1 size-4" />Lida
      </motion.div>
      <motion.div
        drag={isRead ? false : "x"} dragConstraints={{ left: 0, right: 0 }} dragElastic={{ left: 0.7, right: 0 }} style={{ x }}
        onDragEnd={(_, info) => { if (info.offset.x < -90) markRead(); animate(x, 0, { type: "spring", stiffness: 500, damping: 35 }); }}
        className="relative flex items-center bg-ink-900"
      >
        <div className="min-w-0 flex-1">{link?.startsWith("/") ? <Link href={link} onClick={markRead} className="block hover:bg-ink-850">{inner}</Link> : inner}</div>
        {!isRead && <button onClick={markRead} className="btn-ghost mr-2 hidden px-2 text-xs sm:inline-flex" aria-label="Marcar como lida"><Check className="size-4" /></button>}
      </motion.div>
    </li>
  );
}
