import Link from "next/link";
import { CheckCircle2, Circle, Archive } from "lucide-react";
import type { schema } from "@/db";
import { archivePlanAction, toggleGoalAction } from "@/server/actions/lab";
import { evaluateGoal } from "@/lib/lab/progress";
import type { LabMatch } from "@/lib/lab/metrics";
import { isTopic, topicVariant } from "@/lib/lab/trainer";
import { cn } from "@/lib/cn";

type Plan = typeof schema.labPlans.$inferSelect;
const day = (d: Date) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "2-digit" }).format(d);

/** A saved plan with goals. Measurable goals are evaluated on matches played since the plan was created. */
export function PlanCard({ plan, matches, canEdit, q = "", showTopic }: { plan: Plan; matches: LabMatch[]; canEdit: boolean; q?: string; showTopic?: boolean }) {
  const since = matches.filter((m) => m.kickoffAt >= plan.createdAt);
  const tv = isTopic(plan.topic) ? topicVariant(plan.topic, plan.variant) : null;
  const done = plan.goals.filter((g) => g.done).length;
  return (
    <article className="card overflow-hidden">
      <header className="flex flex-wrap items-center gap-2 border-b px-4 py-3 hairline">
        <div className="min-w-0 flex-1">
          {showTopic && tv ? (
            <Link href={`/app/lab/treinador/${plan.topic}${q ? q + "&" : "?"}v=${plan.variant ?? ""}`} className="font-display text-lg font-bold text-ink-100 hover:text-accent-400">{tv.topic.short} — {tv.variant.label}</Link>
          ) : <p className="font-display text-lg font-bold text-ink-100">Seu plano</p>}
          <p className="text-xs text-ink-400">Criado em {day(plan.createdAt)}{plan.origin === "insight" ? " a partir de um alerta do analista" : ""} · {since.length} partida(s) desde então</p>
        </div>
        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", plan.status === "done" ? "bg-win/15 text-win" : plan.status === "archived" ? "bg-ink-700 text-ink-300" : "bg-accent-500/15 text-accent-400")}>
          {plan.status === "done" ? "Concluído" : plan.status === "archived" ? "Arquivado" : `${done}/${plan.goals.length} objetivos`}
        </span>
      </header>
      <ul className="divide-y divide-[var(--line)]">
        {plan.goals.map((g) => {
          const ev = evaluateGoal(g, plan.baseline, since);
          const body = (
            <span className="flex items-start gap-3 text-left">
              {g.done ? <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-win" /> : <Circle className="mt-0.5 size-5 shrink-0 text-ink-500" />}
              <span className="min-w-0">
                <span className={cn("block text-sm", g.done ? "text-ink-400 line-through" : "text-ink-100")}>{g.text}</span>
                <span className={cn("block text-xs", ev?.status === "atingido" ? "text-win" : "text-ink-400")}>
                  {ev ? (ev.status === "atingido" ? `Meta atingida pelos dados — ${ev.text}` : ev.text) : "Autoavaliação: marque quando conseguir."}
                </span>
              </span>
            </span>
          );
          return (
            <li key={g.id} className="px-4 py-3">
              {canEdit && plan.status !== "archived" ? (
                <form action={toggleGoalAction.bind(null, plan.id, g.id)}>
                  <button className="w-full" aria-label={g.done ? `Desmarcar: ${g.text}` : `Concluir: ${g.text}`}>{body}</button>
                </form>
              ) : body}
            </li>
          );
        })}
      </ul>
      {canEdit && plan.status === "active" && (
        <footer className="border-t px-4 py-2 hairline">
          <form action={archivePlanAction.bind(null, plan.id)}><button className="btn-ghost min-h-0 px-2 py-1 text-xs"><Archive className="size-3.5" />Arquivar plano</button></form>
        </footer>
      )}
    </article>
  );
}
