import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ShoppingBag, Tag, Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs: Array<{ to: string; label: string; icon: typeof Home; exact?: boolean }> = [
  { to: "/", label: "Home", icon: Home, exact: true },
  { to: "/marketplace", label: "Market", icon: ShoppingBag },
  { to: "/deals", label: "Deals", icon: Tag },
  { to: "/notifications", label: "Alerts", icon: Bell },
  { to: "/dashboard", label: "Profile", icon: User },
];

export function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {tabs.map(({ to, label, icon: Icon, exact }) => {
          const active = exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`) || pathname.startsWith(`${to}.`);
          return (
            <li key={to}>
              <Link
                to={to}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className={cn("h-5 w-5", active && "scale-110")} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
