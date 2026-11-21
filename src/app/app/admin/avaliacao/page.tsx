import type { Metadata } from "next";
import { requirePage } from "@/server/auth/session";
import { getRatingConfig } from "@/server/services/stats";
import { PageHeader } from "@/components/ui/basics";
import { RatingConfigForm } from "@/components/admin/rating-form";
import { BASE_RATING, DEFAULT_WEIGHTS, METRICS } from "@/lib/rating";
import { POSITION_GROUPS, POSITION_GROUP_LABELS } from "@/lib/domain";

export const metadata: Metadata = { title: "Critérios de avaliação" };

export default async function RatingConfigPage() {
  const ctx = await requirePage("ratings.configure");
  const config = await getRatingConfig(ctx.club.id);
  return (
    <>
      <PageHeader
        eyebrow="Comissão técnica"
        title="Critérios de avaliação"
        description={`Nota da partida = ${BASE_RATING} + Σ (peso × valor da estatística), limitada entre 0 e 10. Estatísticas não registradas são ignoradas. Cada grupo de posição tem seus próprios pesos.`}
      />
      <RatingConfigForm
        groups={POSITION_GROUPS.map((g) => ({ key: g, label: POSITION_GROUP_LABELS[g] }))}
        metrics={Object.entries(METRICS).map(([k, v]) => ({ key: k, label: v.label, unit: v.unit }))}
        weights={config.weights as Record<string, Record<string, number>>}
        defaults={DEFAULT_WEIGHTS as Record<string, Record<string, number>>}
        externalWeight={Math.round(config.externalWeight * 100)}
        minMatchesPct={config.minMatchesPct}
      />
    </>
  );
}
