import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePage } from "@/server/auth/session";
import { markAllReadAction } from "@/server/actions/notifications";
import { EmptyState, PageHeader } from "@/components/ui/basics";
import { fmtDateTime } from "@/lib/format";
import { SwipeNotification } from "@/components/mobile/swipe-notification";

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
          {rows.map((n) => (
            <SwipeNotification key={n.id} id={n.id} title={n.title} body={n.body} when={fmtDateTime(n.createdAt)} link={n.link} read={!!n.readAt} />
          ))}
        </ul>
      )}
    </>
  );
}
