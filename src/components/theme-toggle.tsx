"use client";
import { useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/cn";

type Mode = "system" | "light" | "dark";
const NEXT: Record<Mode, Mode> = { system: "light", light: "dark", dark: "system" };
const LABEL: Record<Mode, string> = { system: "Tema do sistema", light: "Tema claro", dark: "Tema escuro" };

export function ThemeToggle({ initial, className, showLabel }: { initial: Mode; className?: string; showLabel?: boolean }) {
  const [mode, setMode] = useState<Mode>(initial);
  function cycle() {
    const next = NEXT[mode];
    setMode(next);
    const root = document.documentElement;
    if (next === "system") {
      root.removeAttribute("data-theme");
      document.cookie = "ascend_theme=; path=/; max-age=0; samesite=lax";
    } else {
      root.setAttribute("data-theme", next);
      document.cookie = `ascend_theme=${next}; path=/; max-age=31536000; samesite=lax`;
    }
  }
  const Icon = mode === "light" ? Sun : mode === "dark" ? Moon : Monitor;
  return (
    <button type="button" onClick={cycle} className={cn("btn-ghost px-2", className)} aria-label={`${LABEL[mode]} (clique para alternar)`} title={LABEL[mode]}>
      <Icon className="size-4" />
      {showLabel && <span className="text-xs">{LABEL[mode]}</span>}
    </button>
  );
}
