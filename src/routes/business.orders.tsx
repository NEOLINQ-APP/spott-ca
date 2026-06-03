import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/hooks/use-auth";
import { listSellerOrders, markOrderFulfilled } from "@/lib/orders.functions";
import { Loader2, Package, Check } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/business/orders")({
  component: SellerOrdersPage,
  head: () => ({ meta: [{ title: "Orders — Spott.ca Business" }] }),
});

function fmt(cents: number, currency = "CAD") {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(cents / 100);
}

function SellerOrdersPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const fetchOrders = useServerFn(listSellerOrders);
  const fulfill = useServerFn(markOrderFulfilled);

  const [orders, setOrders] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  const refresh = async () => {
    setLoadingData(true);
    try {
      const r = await fetchOrders();
      setOrders(r.orders);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (user) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const onFulfill = async (id: string) => {
    setBusy(id);
    try {
      await fulfill({ data: { order_id: id } });
      toast.success("Order marked fulfilled");
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(null);
    }
  };

  if (!user) return null;

  return (
    <>
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-semibold">Incoming orders</h1>
            <p className="mt-1 text-sm text-muted-foreground">Customers who bought from your marketplace listings.</p>
          </div>
          <Link to="/dashboard" className="text-xs text-muted-foreground hover:underline">
            ← Back to dashboard
          </Link>
        </div>

        {loadingData ? (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <Package className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No orders yet. Share your listings to get started.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orders.map((o) => (
              <div key={o.id} className="rounded-2xl border border-border bg-card p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold">Order {o.id.slice(0, 8)}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(o.created_at).toLocaleString()} · {o.fulfillment}
                      {o.contact_phone && ` · ${o.contact_phone}`}
                      {o.contact_email && ` · ${o.contact_email}`}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                        o.status === "paid"
                          ? "bg-emerald-500/15 text-emerald-600"
                          : o.status === "fulfilled"
                          ? "bg-blue-500/15 text-blue-600"
                          : o.status === "disputed"
                          ? "bg-rose-500/15 text-rose-600"
                          : "bg-amber-500/15 text-amber-600"
                      }`}
                    >
                      {o.status}
                    </span>
                    <div className="text-base font-semibold">{fmt(o.total_cents, o.currency)}</div>
                  </div>
                </div>
                <ul className="mt-3 divide-y divide-border text-sm">
                  {o.items.map((it: any) => (
                    <li key={it.id} className="flex items-center justify-between py-2">
                      <span className="truncate">
                        {it.title} <span className="text-muted-foreground">× {it.quantity}</span>
                      </span>
                      <span>{fmt(it.unit_price_cents * it.quantity, o.currency)}</span>
                    </li>
                  ))}
                </ul>
                {o.notes && (
                  <p className="mt-2 rounded-md bg-muted/40 p-2 text-xs text-muted-foreground">
                    <span className="font-medium">Buyer note:</span> {o.notes}
                  </p>
                )}
                {o.status === "paid" && (
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => onFulfill(o.id)}
                      disabled={busy === o.id}
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {busy === o.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Mark fulfilled
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
