"use client";
import { motion, type HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/cn";

/** Fade + blur + rise when entering the viewport. Use `delay` to stagger siblings. */
export function Reveal({ delay = 0, y = 14, className, children, ...rest }: { delay?: number; y?: number } & HTMLMotionProps<"div">) {
  return (
    <motion.div
      initial={{ opacity: 0, y, filter: "blur(6px)" }}
      whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.55, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
      {...rest}
    >
      {children}
    </motion.div>
  );
}

/** Staggers its direct <RevealItem> children. */
export function Stagger({ className, children, gap = 0.06 }: { className?: string; children: React.ReactNode; gap?: number }) {
  return (
    <motion.div className={className} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-40px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: gap } } }}>
      {children}
    </motion.div>
  );
}

export function RevealItem({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <motion.div className={cn("h-full [&>*]:h-full", className)}
      variants={{ hidden: { opacity: 0, y: 12, filter: "blur(4px)" }, show: { opacity: 1, y: 0, filter: "blur(0px)", transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } } }}>
      {children}
    </motion.div>
  );
}
