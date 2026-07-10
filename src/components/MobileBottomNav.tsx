import { useEffect, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ShoppingBag, Plus, MessageCircle, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { QuickSellButton } from "@/components/QuickSellButton";

type Tab = {
  to: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
  badge?: number;
};

export function MobileBottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (!user) {
      setUnread(0);
      return;
    }
    let cancelled = false;
    const load = async () => {
      const { count } = await supabase
        .from("messages" as any)
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .is("read_at", null);
      if (!cancelled) setUnread(count ?? 0);
    };
    load();
    const channel = supabase
      .channel("mobile-nav-unread")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        () => load(),
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [user]);

  const tabs: Tab[] = [
    { to: "/", label: "Home", icon: Home, exact: true },
    { to: "/marketplace", label: "Marketplace", icon: ShoppingBag },
    { to: "/marketplace/new", label: "Sell", icon: Plus },
    { to: "/notifications", label: "Messages", icon: MessageCircle, badge: unread },
    { to: "/dashboard", label: "Profile", icon: User },
  ];

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5 items-end">
        {tabs.map(({ to, label, icon: Icon, exact, badge }) => {
          const active = exact
            ? pathname === to
            : pathname === to || pathname.startsWith(`${to}/`) || pathname.startsWith(`${to}.`);
          const isSell = label === "Sell";

          if (isSell) {
            return (
              <li key={to} className="flex justify-center">
                <QuickSellButton active={active} />
              </li>
            );
          }

          return (
            <li key={to}>
              <Link
                to={to as "/"}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <span className="relative">
                  <Icon className={cn("h-5 w-5", active && "scale-110")} aria-hidden="true" />
                  {badge && badge > 0 ? (
                    <span className="absolute -top-1.5 -right-2 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
                      {badge > 99 ? "99+" : badge}
                    </span>
                  ) : null}
                </span>
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
