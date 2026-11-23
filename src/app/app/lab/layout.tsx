import { Suspense } from "react";
import { Activity } from "lucide-react";
import { requirePage } from "@/server/auth/session";
import { LabNav } from "@/components/lab/lab-nav";

export default async function LabLayout({ children }: { children: React.ReactNode }) {
  await requirePage("dashboard.view");
  return (
    <div>
      <header className="mb-4 flex items-center gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-[#6f8fff]/35 bg-gradient-to-b from-[#13296f] to-[#050a1c] text-[#8fa9ff] shadow-[0_0_24px_-8px_rgb(58_99_240/0.8)]">
          <Activity className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="eyebrow">Ascend CF · Departamento de desempenho</p>
          <h1 className="font-display text-3xl leading-none font-bold tracking-[0.03em] text-ink-100 uppercase sm:text-4xl">Performance Lab</h1>
        </div>
      </header>
      <Suspense fallback={<div className="mb-5 h-11 border-b hairline" />}><LabNav /></Suspense>
      {children}
    </div>
  );
}
