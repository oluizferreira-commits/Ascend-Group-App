"use client";
import { motion } from "motion/react";
import { cn } from "@/lib/cn";

/** Headline that rises letter by letter (keeps the text accessible to screen readers). */
export function TextReveal({ text, className, delay = 0 }: { text: string; className?: string; delay?: number }) {
  return (
    <span className={cn("inline-block", className)} aria-label={text}>
      {text.split("").map((ch, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="inline-block"
          initial={{ opacity: 0, y: "0.45em", rotateX: -60 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ delay: delay + i * 0.035, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          {ch === " " ? " " : ch}
        </motion.span>
      ))}
    </span>
  );
}
