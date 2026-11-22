import type { Metadata } from "next";
import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePage } from "@/server/auth/session";
import { markAllReadAction } from "@/server/actions/notifications";
import { EmptyState, PageHeader } from "@/components/ui/basics";
import { fmtDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Notificações" };

export default async function NotificationsPage() {
  const ctx = await requirePage();
  const rows = await db.select().from(schema.notifications).where(eq(schema.notifications.userId, ctx.user.id))
    .orderBy(desc(schema.notifications.createdAt)).limit(100);
  return (
    <>
      <PageHeader eyebrow="Comunicação" title="Notificações" actions={rows.some((r) => !r.readAt) && (
        <form action={markAllReadAction}><button className="btn-secondary">Marcar todas como lidas</button></form>
      )} />
      {rows.length === 0 ? <EmptyState title="Nenhuma notificação" /> : (
        <ul className="card divide-y divide-ink-800">
          {rows.map((n) => {
            const inner = (
              <div className="flex gap-3 px-4 py-3">
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.readAt ? "bg-transparent" : "bg-gold-400")} />
                <div className="min-w-0 flex-1">
                  <p className={cn("text-sm", !n.readAt && "font-semibold")}>{n.title}</p>
                  {n.body && <p className="text-sm text-ink-400">{n.body}</p>}
                  <p className="mt-0.5 text-xs text-ink-400">{fmtDateTime(n.createdAt)}</p>
                </div>
              </div>
            );
            return <li key={n.id}>{n.link?.startsWith("/") ? <Link href={n.link} className="block hover:bg-ink-850">{inner}</Link> : inner}</li>;
          })}
        </ul>
      )}
    </>
  );
}
