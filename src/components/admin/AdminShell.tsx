import { ReactNode, useEffect, useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Users,
  Building2,
  Package,
  Mail,
  Receipt,
  Megaphone,
  TicketPercent,
  Wallet,
  BarChart3,
  Settings,
  Search,
  Bell,
  Menu,
  X,
  ShieldCheck,
  Sparkles,
  Crown,
  Car,
  ExternalLink,
  Bot,
  MessagesSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-roles";
import { Loader2 } from "lucide-react";

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/command", label: "Command Center", icon: ShieldCheck },
  { to: "/admin/audit-log", label: "Audit Log", icon: ShieldCheck },
  { to: "/admin/users", label: "Users", icon: Users },
  { to: "/admin/businesses", label: "Businesses", icon: Building2 },
  { to: "/admin/verifications", label: "Verifications", icon: ShieldCheck },
  { to: "/admin/featured", label: "Featured Businesses", icon: Sparkles },
  { to: "/admin/featured/analytics", label: "Featured Analytics", icon: BarChart3 },
  { to: "/admin/reviews", label: "Review Moderation", icon: ShieldCheck },
  { to: "/admin/listings", label: "Marketplace Listings", icon: Package },
  { to: "/admin/listings/bulk-categorize", label: "Bulk Re-Categorize", icon: Package },
  { to: "/admin/vehicles", label: "Vehicles", icon: Car },
  { to: "/admin/transactions", label: "Orders / Transactions", icon: Receipt },
  { to: "/admin/subscribers", label: "Subscribers", icon: Mail },
  { to: "/admin/promoters", label: "Promoters / Affiliates", icon: Megaphone },
  { to: "/admin/codes", label: "Promo Codes", icon: TicketPercent },
  { to: "/admin/payouts", label: "Earnings & Payouts", icon: Wallet },
  { to: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { to: "/admin/sparq", label: "Sparq AI", icon: Bot },
  { to: "/admin/sparq-learning", label: "Sparq Learning", icon: MessagesSquare },
  { to: "/admin/settings", label: "Settings", icon: Settings },
] as const;


export function AdminShell({
  title,
  description,
  children,
  actions,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [range, setRange] = useState("30d");

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  if (authLoading || rolesLoading) {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div>
          <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Admins only</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            You need an admin role to view this area.
          </p>
        </div>
      </div>
    );
  }

  const isActive = (to: string, exact?: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  return (
    <div className="flex min-h-screen w-full bg-muted/30">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 transform border-r bg-background transition-transform md:static md:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b px-4">
          <Link to="/" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground">
              S
            </span>
            <span>Spott Admin</span>
          </Link>
          <button
            className="md:hidden"
            onClick={() => setMobileOpen(false)}
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex flex-col gap-0.5 p-2">
          {NAV.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to, (item as any).exact);
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  active
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t p-2">
          <Link
            to="/admin/legacy"
            className="flex items-center gap-2 rounded-md px-3 py-2 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Legacy admin tools
          </Link>
        </div>
      </aside>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur">
          <button
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users, businesses, transactions…"
              className="pl-9 h-9"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <select
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="h-9 rounded-md border bg-background px-2 text-sm"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="ytd">Year to date</option>
            </select>
            <Button variant="ghost" size="icon" aria-label="Notifications">
              <Bell className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                    {(user?.email ?? "A").slice(0, 1).toUpperCase()}
                  </span>
                  <span className="hidden text-sm md:inline">{user?.email}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>{user?.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/dashboard">My dashboard</Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link to="/admin/legacy">Legacy admin</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page header */}
        <div className="border-b bg-background px-6 py-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
              {description && (
                <p className="mt-1 text-sm text-muted-foreground">{description}</p>
              )}
            </div>
            {actions}
          </div>
        </div>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
