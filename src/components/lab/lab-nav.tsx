"use client";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";

const TABS = [
  { href: "/app/lab", label: "Visão geral" },
  { href: "/app/lab/analise", label: "Análise" },
  { href: "/app/lab/treinador", label: "Treinador" },
  { href: "/app/lab/builds", label: "Builds" },
  { href: "/app/lab/evolucao", label: "Evolução" },
];

/** Performance Lab internal navigation. Keeps the `jogador` param so staff stay on the same player. */
export function LabNav() {
  const pathname = usePathname();
  const sp = useSearchParams();
  const j = sp.get("jogador");
  const q = j ? `?jogador=${encodeURIComponent(j)}` : "";
  return (
    <nav aria-label="Seções do Performance Lab" data-no-swipe
      className="-mx-4 mb-5 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden">
      <ul className="flex min-w-max gap-1 border-b hairline">
        {TABS.map((t) => {
          const active = t.href === "/app/lab" ? pathname === "/app/lab" : pathname.startsWith(t.href);
          return (
            <li key={t.href}>
              <Link href={t.href + q} aria-current={active ? "page" : undefined}
                className={cn("relative block px-3.5 pt-2 pb-2.5 font-display text-[15px] font-semibold tracking-[0.06em] uppercase transition-colors",
                  active ? "text-ink-100" : "text-ink-400 hover:text-ink-200")}>
                {t.label}
                {active && <motion.span layoutId="lab-tab" className="absolute inset-x-2 -bottom-px h-[2px] rounded-full bg-gradient-to-r from-[#3a63f0] to-[#8fa9ff]" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
