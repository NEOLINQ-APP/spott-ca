import { ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Link2, Users } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

const NAV = [
  { to: "/partner/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/partner/referral", label: "Referral Center", icon: Link2 },
  { to: "/partner/leads", label: "My Leads", icon: Users },
] as const;

export function PartnerShell({
  displayName,
  children,
}: {
  displayName: string;
  children: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <>
      <SiteHeader />
      <main className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[220px_1fr]">
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="rounded-xl border border-border bg-card p-3">
            <div className="px-2 py-2">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">SPOTT Auto Partner</div>
              <div className="truncate text-sm font-semibold">{displayName}</div>
            </div>
            <nav className="mt-1 flex flex-col gap-0.5">
              {NAV.map((n) => {
                const Icon = n.icon;
                const active = pathname === n.to;
                return (
                  <Link
                    key={n.to}
                    to={n.to}
                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ${
                      active ? "bg-primary text-primary-foreground" : "hover:bg-muted text-foreground/80"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{n.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>
        <div>{children}</div>
      </main>
    </>
  );
}
