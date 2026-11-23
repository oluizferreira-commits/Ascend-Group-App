import type { Metadata } from "next";
import Link from "next/link";
import { Download, FileJson, Info } from "lucide-react";
import { requirePage } from "@/server/auth/session";
import { listCostTables } from "@/server/services/cost-tables";
import { importCostTableAction } from "@/server/actions/cost-tables";
import { ImportCostTableForm } from "@/components/admin/cost-table-forms";
import { EmptyState, PageHeader } from "@/components/ui/basics";
import { Panel } from "@/components/ui/kit";
import { GAME_VERSION } from "@/lib/lab/game-data";
import { cn } from "@/lib/cn";
import { COST_TABLE_STATUS } from "@/lib/lab/cost-status";

export const metadata: Metadata = { title: "Custos de builds" };

export default async function CostTablesPage() {
  await requirePage("gamedata.manage");
  const tables = await listCostTables();
  return (
    <>
      <PageHeader eyebrow="Performance Lab · Dados do jogo" title="Custos de builds"
        description="Tabelas de custo de pontos de qualidade (AP) por versão, temporada e arquétipo. Só tabelas verificadas validam builds; correções viram uma nova revisão e builds antigas continuam ligadas à revisão em que foram feitas."
        actions={<a href="/api/lab/modelo-custos" className="btn-secondary"><Download className="size-4" />Baixar modelo</a>} />
      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <section>
          {tables.length === 0 ? (
            <EmptyState title="Nenhuma tabela cadastrada">
              Enquanto não houver uma tabela verificada, o construtor de builds funciona em modo planejamento (“orçamento não validado”).
            </EmptyState>
          ) : (
            <ul className="card divide-y divide-[var(--line)] overflow-hidden">
              {tables.map((t) => {
                const attrs = Object.keys(t.data.attrs ?? {}).length, levels = Object.keys(t.data.levelBudget ?? {}).length;
                return (
                  <li key={t.id}>
                    <Link href={`/app/admin/custos-builds/${t.id}`} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-[var(--surface-2)]">
                      <FileJson className="size-5 shrink-0 text-accent-400" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{t.archetype} <span className="font-normal text-ink-400">· {t.season} · {t.gameVersion}</span></span>
                        <span className="block text-xs text-ink-400">Rev. {t.revision} · {attrs} atributos · {levels} níveis · {t.builds} build(s){t.source ? ` · fonte: ${t.source}` : ""}{t.verifiedOn ? ` · verificada em ${t.verifiedOn.split("-").reverse().join("/")}` : ""}</span>
                      </span>
                      <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-semibold", COST_TABLE_STATUS[t.status]?.cls)}>{COST_TABLE_STATUS[t.status]?.label ?? t.status}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-3 flex gap-2 text-xs text-ink-400"><Info className="mt-0.5 size-3.5 shrink-0" />Nunca importe valores estimados. Se um dado não estiver confirmado, deixe-o de fora: o motor recusa calcular o que não está na tabela.</p>
        </section>
        <Panel title="Importar tabela">
          <ImportCostTableForm action={importCostTableAction} defaultVersion={GAME_VERSION} />
        </Panel>
      </div>
    </>
  );
}
