import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Car, ShoppingBag, Building2 } from "lucide-react";

type SectionKey = "home" | "vehicles" | "marketplace" | "business";

// Top-level navigation across the unified Spott platform.
// Business Directory and Marketplace are kept clearly separate so that
// search/filtering routes to the right system.
const TABS: Array<{
  key: SectionKey;
  to: string;
  search?: Record<string, unknown>;
  label: string;
  Icon: typeof Home;
  matches: (path: string, search: Record<string, unknown>) => boolean;
}> = [
  {
    key: "home",
    to: "/",
    label: "Home",
    Icon: Home,
    matches: (p) => p === "/",
  },
  {
    key: "vehicles",
    to: "/vehicles",
    label: "Vehicles",
    Icon: Car,
    matches: (p) => p === "/vehicles" || p.startsWith("/vehicles/"),
  },
  {
    key: "marketplace",
    to: "/listings",
    search: { section: "marketplace" },
    label: "Marketplace",
    Icon: ShoppingBag,
    matches: (p, s) =>
      (p === "/listings" && (s as any)?.section !== "business-directory") ||
      p === "/marketplace" ||
      p.startsWith("/marketplace/"),
  },
  {
    key: "business",
    to: "/listings",
    search: { section: "business-directory" },
    label: "Business Directory",
    Icon: Building2,
    matches: (p, s) =>
      ((p === "/listings" || p.startsWith("/listings/")) &&
        (s as any)?.section === "business-directory") ||
      p === "/directory" ||
      p.startsWith("/directory/"),
  },
];

export function SectionSwitcher(_props: { active?: string } = {}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const search = useRouterState({ select: (s) => s.location.search }) as unknown as Record<string, unknown>;
  const base =
    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs sm:text-sm font-medium transition";
  const activeCls = "bg-primary text-primary-foreground shadow-sm";
  const idleCls = "text-muted-foreground hover:text-foreground hover:bg-accent/10";

  return (
    <div
      role="tablist"
      aria-label="Primary navigation"
      className="inline-flex items-center gap-1 rounded-lg border border-border bg-card/60 p-1 backdrop-blur"
    >
      {TABS.map(({ key, to, search: sp, label, Icon, matches }) => {
        const isActive = matches(pathname, search);
        return (
          <Link
            key={key}
            to={to as "/"}
            search={sp as any}
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
