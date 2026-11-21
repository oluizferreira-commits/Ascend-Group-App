import Link from "next/link";
import { Crest } from "@/components/crest";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <Link href="/" className="mb-6 flex flex-col items-center gap-3 text-center">
        <Crest size={96} priority />
        <span className="eyebrow">Ascend Group</span>
      </Link>
      <div className="card w-full max-w-sm p-6 animate-rise">{children}</div>
      <p className="mt-8 font-display text-sm tracking-[0.3em] text-gold-500/80">RISE. CONQUER. ASCEND.</p>
    </main>
  );
}
