import Link from "next/link";
import { Crest } from "@/components/crest";
import { Reveal } from "@/components/fx/reveal";
import { TextReveal } from "@/components/fx/text-reveal";
import { BorderBeam } from "@/components/fx/border-beam";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="card-premium hidden rounded-none border-0 lg:flex lg:flex-col lg:items-center lg:justify-center lg:gap-6 lg:p-12">
        <Crest size={280} priority />
        <p className="font-display text-6xl font-bold tracking-[0.04em] text-white uppercase"><TextReveal text="Ascend CF" delay={0.15} /></p>
        <p className="font-display text-lg tracking-[0.45em] text-silver">RISE. CONQUER. ASCEND.</p>
      </section>
      <section className="flex flex-col items-center justify-center px-4 py-10">
        <Link href="/" className="mb-8 flex flex-col items-center gap-3 lg:hidden">
          <Crest size={110} priority />
          <span className="font-display text-xs font-semibold tracking-[0.35em] text-ink-400 uppercase">Ascend Group</span>
        </Link>
        <Reveal className="card relative w-full max-w-sm overflow-hidden p-7"><BorderBeam duration={12} />{children}</Reveal>
        <p className="mt-6 flex gap-4 text-xs text-ink-400"><Link href="/" className="hover:text-accent-400">← Site do clube</Link><Link href="/privacidade" className="hover:text-accent-400">Privacidade e cookies</Link></p>
      </section>
    </main>
  );
}
