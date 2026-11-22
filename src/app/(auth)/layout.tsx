import Link from "next/link";
import { Crest } from "@/components/crest";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-2">
      <section className="card-premium hidden rounded-none border-0 lg:flex lg:flex-col lg:items-center lg:justify-center lg:gap-6 lg:p-12">
        <Crest size={280} priority />
        <p className="font-display text-6xl font-bold tracking-[0.04em] text-white uppercase">Ascend CF</p>
        <p className="font-display text-lg tracking-[0.45em] text-silver">RISE. CONQUER. ASCEND.</p>
      </section>
      <section className="flex flex-col items-center justify-center px-4 py-10">
        <Link href="/" className="mb-8 flex flex-col items-center gap-3 lg:hidden">
          <Crest size={110} priority />
          <span className="font-display text-xs font-semibold tracking-[0.35em] text-ink-400 uppercase">Ascend Group</span>
        </Link>
        <div className="card w-full max-w-sm p-7">{children}</div>
        <Link href="/" className="mt-6 text-xs text-ink-400 hover:text-accent-400">← Voltar ao site do clube</Link>
      </section>
    </main>
  );
}
