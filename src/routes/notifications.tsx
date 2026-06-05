import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bell, MessageSquare, ShoppingBag, Tag } from "lucide-react";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — Spott" },
      { name: "description", content: "Your messages, order updates, and deal alerts on Spott." },
    ],
  }),
  component: NotificationsPage,
});

type Item = {
  id: string;
  kind: "message" | "order" | "deal";
  title: string;
  body: string;
  at: string;
  to: string;
};

function NotificationsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const collected: Item[] = [];

      if (userId) {
        const { data: threads } = await supabase
          .from("dm_threads")
          .select("id,last_message_at,businesses(name,slug)")
          .eq("customer_id", userId)
          .order("last_message_at", { ascending: false })
          .limit(10);
        for (const t of (threads ?? []) as any[]) {
          if (!t.last_message_at) continue;
          collected.push({
            id: `dm-${t.id}`,
            kind: "message",
            title: `New message from ${t.businesses?.name ?? "a business"}`,
            body: "Tap to open the conversation.",
            at: t.last_message_at,
            to: "/dashboard",
          });
        }

        const { data: orders } = await supabase
          .from("marketplace_orders")
          .select("id,status,created_at,total_amount")
          .eq("buyer_id", userId)
          .order("created_at", { ascending: false })
          .limit(5);
        for (const o of (orders ?? []) as any[]) {
          collected.push({
            id: `order-${o.id}`,
            kind: "order",
            title: `Order ${o.status === "delivered" ? "delivered" : "update"}`,
            body: `Status: ${o.status} · $${Number(o.total_amount).toFixed(2)}`,
            at: o.created_at,
            to: "/orders",
          });
        }
      }

      const { data: deals } = await supabase
        .from("specials")
        .select("id,title,discount_label,created_at,businesses(name,slug)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(8);
      for (const d of (deals ?? []) as any[]) {
        collected.push({
          id: `deal-${d.id}`,
          kind: "deal",
          title: `${d.discount_label ? d.discount_label + " · " : ""}${d.title}`,
          body: `From ${d.businesses?.name ?? "a local business"}`,
          at: d.created_at,
          to: "/deals",
        });
      }

      collected.sort((a, b) => +new Date(b.at) - +new Date(a.at));
      if (!cancelled) {
        setItems(collected);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 pb-24 md:pb-12">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold flex items-center gap-2">
          <Bell className="h-7 w-7 text-primary" /> Notifications
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {userId ? "Your latest messages, orders, and deal alerts." : "Sign in to see your personal alerts. Latest public deals shown below."}
        </p>
        {!userId && (
          <Link to="/auth" className="mt-2 inline-flex text-sm font-medium text-primary hover:underline">
            Sign in →
          </Link>
        )}
      </header>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">You're all caught up.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {items.map((n) => {
            const Icon = n.kind === "message" ? MessageSquare : n.kind === "order" ? ShoppingBag : Tag;
            return (
              <li key={n.id}>
                <Link to={n.to} className="flex items-start gap-3 p-4 transition hover:bg-accent/30">
                  <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{n.title}</p>
                    <p className="truncate text-xs text-muted-foreground">{n.body}</p>
                  </div>
                  <time className="shrink-0 text-[11px] text-muted-foreground">
                    {new Date(n.at).toLocaleDateString()}
                  </time>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
