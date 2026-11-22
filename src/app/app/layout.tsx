import { and, eq, isNull, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import { requirePage } from "@/server/auth/session";
import { getThemeMode } from "@/lib/theme";
import { after } from "next/server";
import { maybeAutoSync } from "@/server/services/ea-sync";
import { ROLES } from "@/server/auth/permissions";
import { NAV } from "@/components/shell/nav";
import { MobileTabBar, Sidebar } from "@/components/shell/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requirePage();
  // Keep EA data fresh without any external scheduler (throttled to once per 30 min).
  after(() => maybeAutoSync(ctx.club.id));
  const sections = NAV.map((s) => ({
    section: s.section,
    items: s.items.filter((i) => i.soon || !i.permission || ctx.permissions.has(i.permission)),
  })).filter((s) => s.items.length > 0);
  const TAB_HREFS = ["/app", "/app/elenco", "/app/partidas", "/app/calendario", "/app/avisos"];
  const tabs = NAV[0].items.filter((i) => TAB_HREFS.includes(i.href) && (!i.permission || ctx.permissions.has(i.permission)));
  const [{ unread }] = await db.select({ unread: sql<number>`count(*)::int` }).from(schema.notifications)
    .where(and(eq(schema.notifications.userId, ctx.user.id), isNull(schema.notifications.readAt)));
  const roleNames = ctx.roles.map((r) => ROLES[r].name).join(" · ");
  return (
    <div className="min-h-dvh">
      <Sidebar sections={sections} userName={ctx.user.displayName} roleNames={roleNames} unread={unread} theme={await getThemeMode()} />
      <main className="px-4 pt-6 pb-28 sm:px-6 lg:ml-64 lg:px-10 lg:pt-10 lg:pb-12">
        <div className="mx-auto max-w-7xl min-w-0">{children}</div>
      </main>
      <MobileTabBar items={tabs} />
    </div>
  );
}
