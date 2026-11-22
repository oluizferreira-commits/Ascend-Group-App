"use client";
import { useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * Card with a soft radial highlight that follows the pointer (desktop) — Origin/21st style.
 * Pure CSS variables, no re-renders.
 */
export function SpotlightCard({ className, children, as: Tag = "div" }: { className?: string; children: React.ReactNode; as?: "div" | "article" | "section" }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <Tag
      ref={ref as React.RefObject<HTMLDivElement>}
      onPointerMove={(e) => {
        const r = ref.current?.getBoundingClientRect();
        if (!r || e.pointerType !== "mouse") return;
        ref.current!.style.setProperty("--sx", `${e.clientX - r.left}px`);
        ref.current!.style.setProperty("--sy", `${e.clientY - r.top}px`);
      }}
      className={cn("group/spot relative", className)}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0 transition-opacity duration-300 group-hover/spot:opacity-100"
        style={{ background: "radial-gradient(420px circle at var(--sx, 50%) var(--sy, 0%), color-mix(in oklab, var(--accent-500) 14%, transparent), transparent 60%)" }}
      />
      {children}
    </Tag>
  );
}
