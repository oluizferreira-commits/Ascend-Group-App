import { requirePage } from "@/server/auth/session";
import { ROLES } from "@/server/auth/permissions";
import { NAV } from "@/components/shell/nav";
import { MobileTabBar, Sidebar } from "@/components/shell/sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requirePage();
  const sections = NAV.map((s) => ({
    section: s.section,
    items: s.items.filter((i) => i.soon || !i.permission || ctx.permissions.has(i.permission)),
  })).filter((s) => s.items.length > 0);
  const tabs = NAV[0].items.filter((i) => !i.permission || ctx.permissions.has(i.permission)).slice(0, 5);
  const roleNames = ctx.roles.map((r) => ROLES[r].name).join(" · ");
  return (
    <div className="min-h-dvh">
      <Sidebar sections={sections} userName={ctx.user.displayName} roleNames={roleNames} />
      <main className="px-4 pt-6 pb-28 sm:px-6 lg:ml-64 lg:px-10 lg:pt-10 lg:pb-12">
        <div className="mx-auto max-w-7xl min-w-0">{children}</div>
      </main>
      <MobileTabBar items={tabs} />
    </div>
  );
}
