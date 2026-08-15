import { createFileRoute, Link, Outlet, redirect, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { LayoutDashboard, Car, Inbox, BarChart3, CreditCard, Sparkles, Upload } from "lucide-react";

export const Route = createFileRoute("/dealer")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: DealerLayout,
  head: () => ({
    meta: [
      { title: "Dealer dashboard — Spott.ca" },
      { name: "description", content: "Manage your dealership inventory, leads, analytics and billing on Spott.ca." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

const NAV = [
  { to: "/dealer", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/dealer/vehicles", label: "Vehicles", icon: Car },
  { to: "/dealer/feed", label: "Feed", icon: Upload },
  { to: "/dealer/leads", label: "Leads", icon: Inbox },
  { to: "/dealer/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/dealer/plans", label: "Plans & trial", icon: Sparkles },
  { to: "/business/billing", label: "Billing", icon: CreditCard },
];

function DealerLayout() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="container mx-auto px-4 py-6">
        <h1 className="font-display text-3xl font-semibold">Dealer dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Inventory, leads, analytics, and your Founding Dealer plan.
        </p>
        <nav className="mt-5 flex flex-wrap gap-1 border-b border-border">
          {NAV.map((n) => {
            const active = n.exact ? path === n.to : path.startsWith(n.to);
            return (
              <Link
                key={n.to}
                to={n.to}
                className={`inline-flex items-center gap-2 px-3 py-2 text-sm rounded-t-md border-b-2 -mb-px transition ${
                  active
                    ? "border-primary text-foreground font-medium"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <n.icon className="h-4 w-4" /> {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
