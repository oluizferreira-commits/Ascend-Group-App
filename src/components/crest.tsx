"use client";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/cn";

export const CREST_SRC = "/brand/ascend-fc-crest.png";
/** Same crest with the black backdrop made transparent — for always-dark surfaces only. */
export const CREST_CLEAR_SRC = "/brand/generated/crest-clear-512.png";

/**
 * Displays the ORIGINAL Ascend CF crest. Next/Image produces resized display
 * variants on demand; the source file is never altered. If the file has not
 * been added to public/brand yet, a neutral placeholder is shown (no
 * substitute crest is ever drawn).
 */
export function Crest({ size = 48, className, priority, clear }: { size?: number; className?: string; priority?: boolean; clear?: boolean }) {
  const [missing, setMissing] = useState(false);
  if (missing) {
    return (
      <div
        role="img"
        aria-label="Escudo oficial pendente"
        title="Adicione o escudo original em public/brand/ascend-fc-crest.png"
        style={{ width: size, height: size }}
        className={cn("grid shrink-0 place-items-center rounded-md border border-dashed border-ink-500 text-center text-[9px] leading-tight text-ink-400", className)}
      >
        {size >= 40 ? "ESCUDO" : ""}
      </div>
    );
  }
  return (
    <Image
      src={clear ? CREST_CLEAR_SRC : CREST_SRC}
      alt="Escudo oficial do Ascend CF"
      width={size}
      height={size}
      priority={priority}
      onError={() => setMissing(true)}
      className={cn("h-auto shrink-0 object-contain drop-shadow-[0_6px_18px_rgb(4_10_40/0.35)]", className)}
      style={{ width: size, height: "auto" }}
    />
  );
}
