"use client";
import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/cn";

export const CREST_SRC = "/brand/ascend-fc-crest.png";

/**
 * Displays the ORIGINAL Ascend FC crest. Next/Image produces resized display
 * variants on demand; the source file is never altered. If the file has not
 * been added to public/brand yet, a neutral placeholder is shown (no
 * substitute crest is ever drawn).
 */
export function Crest({ size = 48, className, priority }: { size?: number; className?: string; priority?: boolean }) {
  const [missing, setMissing] = useState(false);
  if (missing) {
    return (
      <div
        role="img"
        aria-label="Escudo oficial pendente"
        title="Adicione o escudo original em public/brand/ascend-fc-crest.png"
        style={{ width: size, height: size }}
        className={cn("grid shrink-0 place-items-center rounded-md border border-dashed border-gold-600/50 text-center text-[9px] leading-tight text-gold-500/80", className)}
      >
        {size >= 40 ? "ESCUDO" : ""}
      </div>
    );
  }
  return (
    <Image
      src={CREST_SRC}
      alt="Escudo oficial do Ascend FC"
      width={size}
      height={size}
      priority={priority}
      onError={() => setMissing(true)}
      className={cn("h-auto shrink-0 object-contain drop-shadow-[0_4px_14px_rgb(201_162_74/0.25)]", className)}
      style={{ width: size, height: "auto" }}
    />
  );
}
