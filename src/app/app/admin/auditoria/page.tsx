import type { Metadata } from "next";
import { desc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePage } from "@/server/auth/session";
import { PageHeader } from "@/components/ui/basics";
import { fmtDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Auditoria" };

export default async function AuditPage() {
  const ctx = await requirePage("audit.view");
  const rows = await db
    .select({ log: schema.auditLogs, actor: schema.users.displayName })
    .from(schema.auditLogs)
    .leftJoin(schema.users, eq(schema.users.id, schema.auditLogs.actorUserId))
    .where(eq(schema.auditLogs.clubId, ctx.club.id))
    .orderBy(desc(schema.auditLogs.createdAt))
    .limit(300);
  return (
    <>
      <PageHeader eyebrow="Administração" title="Auditoria" description="Registro imutável das ações administrativas (últimas 300). O banco de dados bloqueia alterações e exclusões deste registro." />
      <div className="card overflow-x-auto">
        <table className="data-table">
          <thead><tr><th>Quando</th><th>Quem</th><th>Ação</th><th>Alvo</th><th>Detalhes</th></tr></thead>
          <tbody>
            {rows.map(({ log, actor }) => (
              <tr key={log.id}>
                <td>{fmtDateTime(log.createdAt)}</td>
                <td>{actor ?? <span className="text-ink-400">sistema</span>}</td>
                <td><code className="text-xs text-gold-300">{log.action}</code></td>
                <td className="text-xs text-ink-400">{log.entityType}{log.entityId ? ` · ${log.entityId.slice(0, 8)}` : ""}</td>
                <td className="max-w-md truncate text-xs text-ink-400" title={JSON.stringify(log.metadata)}>{JSON.stringify(log.metadata)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
