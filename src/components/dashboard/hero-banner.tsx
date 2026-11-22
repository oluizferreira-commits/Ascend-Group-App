import Link from "next/link";
import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/cn";

/**
 * Club banner: crest artwork on the left, headline and call-to-action on the right.
 * Pure CSS lighting — no stock images, no fictitious content.
 */
export function HeroBanner({ kicker, title, sub, cta, href, ariaLabel, art, children, className }: {
  kicker: string; title: React.ReactNode; sub?: React.ReactNode; cta?: string; href?: string; ariaLabel?: string;
  /** Replaces the crest artwork (e.g. award ball). */
  art?: React.ReactNode; children?: React.ReactNode; className?: string;
}) {
  const body = (
    <div className={cn("card-premium relative flex min-h-[188px] items-stretch sm:min-h-[220px]", className)}>
      {/* stadium light + streaks */}
      <span aria-hidden className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(60% 80% at 92% 8%, rgb(143 169 255 / 0.22), transparent 60%), linear-gradient(100deg, transparent 30%, rgb(111 143 255 / 0.10) 34%, transparent 40%), linear-gradient(100deg, transparent 44%, rgb(111 143 255 / 0.06) 47%, transparent 52%)" }} />
      <div className="relative flex w-[40%] shrink-0 items-center justify-center overflow-hidden sm:w-[36%]">
        <span aria-hidden className="absolute size-[150%] rounded-full" style={{ background: "radial-gradient(circle, rgb(58 99 240 / 0.35) 0%, transparent 60%)" }} />
        {art ?? (
          <Image src="/brand/generated/crest-clear-256.png" alt="" width={256} height={256} priority
            className="relative h-auto w-[82%] max-w-[190px] -rotate-6 drop-shadow-[0_14px_28px_rgb(0_0_0/0.6)]" />
        )}
      </div>
      <div className="relative flex min-w-0 flex-1 flex-col justify-center py-5 pr-4 sm:pr-8">
        <p className="font-display text-sm font-bold tracking-[0.16em] text-[#8fa9ff] uppercase italic">{kicker}</p>
        <div className="mt-0.5 font-display text-[28px] leading-[0.95] font-bold text-white uppercase italic sm:text-5xl">{title}</div>
        {sub && <div className="mt-2 truncate text-sm text-ink-200 sm:text-base">{sub}</div>}
        {children}
        {cta && (
          <span className="btn-primary mt-3 min-h-9 w-fit gap-2 px-4 py-1.5 text-sm">{cta}<ArrowRight className="size-4" /></span>
        )}
      </div>
    </div>
  );
  return href ? <Link href={href} aria-label={ariaLabel} className="block rounded-xl focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:outline-none">{body}</Link> : body;
}
