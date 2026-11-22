import type { Metadata } from "next";
import Link from "next/link";
import { and, desc, eq, sql } from "drizzle-orm";
import { ExternalLink } from "lucide-react";
import { db, schema } from "@/db";
import { requirePage } from "@/server/auth/session";
import { Avatar, Badge, EmptyState, PageHeader } from "@/components/ui/basics";
import { CopyLink } from "@/components/recruitment/staff";
import { APPLICATION_STATUS_LABELS, PLATFORMS } from "@/lib/validation/application";
import { POSITION_GROUPS, POSITION_GROUP_LABELS, POSITION_LABELS, positionGroup, type PositionGroup } from "@/lib/domain";
import { fmtDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Seja do Ascend — propostas" };
const tone = { new: "gold", reviewing: "wine", approved: "win", rejected: "loss" } as const;
type Status = keyof typeof APPLICATION_STATUS_LABELS;

export default async function ApplicationsPage({ searchParams }: { searchParams: Promise<{ status?: string; group?: string; platform?: string }> }) {
  const ctx = await requirePage("recruitment.manage");
  const sp = await searchParams;
  const status = (Object.keys(APPLICATION_STATUS_LABELS) as Status[]).includes(sp.status as Status) ? (sp.status as Status) : undefined;
  const group = POSITION_GROUPS.includes(sp.group as PositionGroup) ? (sp.group as PositionGroup) : undefined;
  const platform = sp.platform && sp.platform in PLATFORMS ? sp.platform : undefined;
  const [rows, counts] = await Promise.all([
    db.select({
      id: schema.transferApplications.id, status: schema.transferApplications.status, fullName: schema.transferApplications.fullName,
      eaName: schema.transferApplications.eaName, platform: schema.transferApplications.platform, primaryPosition: schema.transferApplications.primaryPosition,
      overall: schema.transferApplications.overall, hasPhoto: schema.transferApplications.hasPhoto, createdAt: schema.transferApplications.createdAt,
    }).from(schema.transferApplications)
      .where(and(eq(schema.transferApplications.clubId, ctx.club.id), status ? eq(schema.transferApplications.status, status) : undefined,
        platform ? eq(schema.transferApplications.platform, platform) : undefined))
      .orderBy(desc(schema.transferApplications.createdAt)).limit(500),
    db.select({ status: schema.transferApplications.status, n: sql<number>`count(*)::int` }).from(schema.transferApplications)
      .where(eq(schema.transferApplications.clubId, ctx.club.id)).groupBy(schema.transferApplications.status),
  ]);
  const list = group ? rows.filter((r) => positionGroup(r.primaryPosition) === group) : rows;
  const count = (s: Status) => counts.find((c) => c.status === s)?.n ?? 0;
  const publicUrl = `${process.env.APP_URL?.replace(/\/$/, "") ?? ""}/seja-do-ascend`;
  const qs = (patch: Record<string, string | undefined>) => {
    const p = new URLSearchParams(Object.entries({ status, group, platform, ...patch }).filter(([, v]) => v) as [string, string][]);
    return `/app/propostas${p.size ? `?${p}` : ""}`;
  };

  return (
    <>
      <PageHeader eyebrow="Recrutamento" title="Seja do Ascend" description="Propostas enviadas pelo link público. Os contatos ficam visíveis apenas para a diretoria e o treinador."
        actions={<><CopyLink url={publicUrl} /><Link href="/seja-do-ascend" target="_blank" className="btn-secondary"><ExternalLink className="size-4" />Ver página</Link></>} />

      <div className="mb-4 flex flex-wrap gap-2">
        <Link href={qs({ status: undefined })} className={!status ? "btn-primary min-h-0 py-1.5" : "btn-secondary min-h-0 py-1.5"}>Todas</Link>
        {(Object.keys(APPLICATION_STATUS_LABELS) as Status[]).map((s) => (
          <Link key={s} href={qs({ status: s })} className={status === s ? "btn-primary min-h-0 py-1.5" : "btn-secondary min-h-0 py-1.5"}>{APPLICATION_STATUS_LABELS[s]} ({count(s)})</Link>
        ))}
      </div>
      <form method="get" className="card mb-5 flex flex-wrap items-end gap-3 p-4">
        {status && <input type="hidden" name="status" value={status} />}
        <label className="text-sm"><span className="label">Posição</span>
          <select name="group" defaultValue={group ?? ""} className="input"><option value="">Todas</option>{POSITION_GROUPS.map((g) => <option key={g} value={g}>{POSITION_GROUP_LABELS[g]}</option>)}</select>
        </label>
        <label className="text-sm"><span className="label">Plataforma</span>
          <select name="platform" defaultValue={platform ?? ""} className="input"><option value="">Todas</option>{Object.entries(PLATFORMS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </label>
        <button className="btn-secondary">Filtrar</button>
      </form>

      {list.length === 0 ? <EmptyState title="Nenhuma proposta">Divulgue o link <b>{publicUrl}</b> nas redes do clube.</EmptyState> : (
        <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map((a) => (
            <li key={a.id}>
              <Link href={`/app/propostas/${a.id}`} className="card flex items-center gap-3 p-4 hover:border-accent-500">
                {a.hasPhoto
                  ? // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/api/propostas/${a.id}/foto`} alt="" className="size-14 shrink-0 rounded-md object-cover" />
                  : <Avatar name={a.eaName} size={56} />}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-display text-lg font-bold uppercase">{a.eaName}</p>
                  <p className="truncate text-xs text-ink-400">{POSITION_LABELS[a.primaryPosition]} · {PLATFORMS[a.platform as keyof typeof PLATFORMS] ?? a.platform}{a.overall ? ` · OVR ${a.overall}` : ""}</p>
                  <p className="truncate text-xs text-ink-400">{a.fullName} · {fmtDateTime(a.createdAt)}</p>
                </div>
                <Badge tone={tone[a.status]}>{APPLICATION_STATUS_LABELS[a.status]}</Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
