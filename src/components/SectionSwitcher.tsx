import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Car, ShoppingBag, LayoutDashboard } from "lucide-react";

type SectionKey = "home" | "vehicles" | "listings" | "dashboard";

// Spott is a single unified platform — no separate apps or systems.
// These tabs are simply primary navigation across one marketplace.
const TABS: Array<{ key: SectionKey; to: string; label: string; Icon: typeof Home; matches: (path: string) => boolean }> = [
  { key: "home", to: "/", label: "Home", Icon: Home, matches: (p) => p === "/" },
  { key: "vehicles", to: "/vehicles", label: "Vehicles", Icon: Car, matches: (p) => p === "/vehicles" || p.startsWith("/vehicles/") },
  { key: "listings", to: "/listings", label: "Listings", Icon: ShoppingBag, matches: (p) =>
      p === "/listings" || p.startsWith("/listings/") ||
      p === "/marketplace" || p.startsWith("/marketplace/") ||
      p === "/browse" || p.startsWith("/browse/") ||
      p === "/directory" || p.startsWith("/directory/") },
  { key: "dashboard", to: "/dashboard", label: "Dashboard", Icon: LayoutDashboard, matches: (p) => p === "/dashboard" || p.startsWith("/dashboard/") },
];

// `active` prop kept for backwards-compat with existing callers but ignored;
// the active tab is derived from the current pathname.
export function SectionSwitcher(_props: { active?: string } = {}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const base = "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs sm:text-sm font-medium transition";
  const activeCls = "bg-primary text-primary-foreground shadow-sm";
  const idleCls = "text-muted-foreground hover:text-foreground hover:bg-accent/10";

  return (
    <div
      role="tablist"
      aria-label="Primary navigation"
      className="inline-flex items-center gap-1 rounded-lg border border-border bg-card/60 p-1 backdrop-blur"
    >
      {TABS.map(({ key, to, label, Icon, matches }) => {
        const isActive = matches(pathname);
        return (
          <Link
            key={key}
            to={to as "/"}
            role="tab"
            aria-selected={isActive}
            className={`${base} ${isActive ? activeCls : idleCls}`}
          >
            <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span>{label}</span>
          </Link>
        );
      })}
    </div>
  );
}
