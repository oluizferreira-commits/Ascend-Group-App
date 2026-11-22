import { cn } from "@/lib/cn";

/** Broadcast-style infinite ticker. Pauses on hover; static when reduced motion is on. */
export function Marquee({ children, className, duration = 40 }: { children: React.ReactNode; className?: string; duration?: number }) {
  return (
    <div className={cn("group/mq relative flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]", className)}>
      {[0, 1].map((i) => (
        <div key={i} aria-hidden={i === 1}
          className="flex shrink-0 animate-[marquee_var(--mq-d)_linear_infinite] items-center gap-8 pr-8 group-hover/mq:[animation-play-state:paused] motion-reduce:animate-none"
          style={{ ["--mq-d" as string]: `${duration}s` }}>
          {children}
        </div>
      ))}
    </div>
  );
}
