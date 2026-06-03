import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/hooks/use-auth";
import { listMyOrders, openDispute, confirmOrderReceived } from "@/lib/orders.functions";
import { Loader2, Package, AlertTriangle, ShieldCheck, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/orders")({
  component: OrdersPage,
  head: () => ({ meta: [{ title: "My orders — Spott.ca" }] }),
});

function fmt(cents: number, currency = "CAD") {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(cents / 100);
}

function OrdersPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const fetchOrders = useServerFn(listMyOrders);
  const fileDispute = useServerFn(openDispute);
  const confirmReceived = useServerFn(confirmOrderReceived);

  const [orders, setOrders] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [openingFor, setOpeningFor] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);

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

  const submitDispute = async (orderId: string) => {
    if (!reason.trim()) return;
    try {
      await fileDispute({ data: { order_id: orderId, reason: reason.trim() } });
      toast.success("Dispute opened — our team will review it");
      setOpeningFor(null);
      setReason("");
      refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not open dispute");
    }
  };

  if (!user) return null;

  return (
    <>
      <SiteHeader />
      <div className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="font-display text-3xl font-semibold">My orders</h1>
        {loadingData ? (
          <div className="mt-8 flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : orders.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center">
            <Package className="mx-auto h-10 w-10 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">No orders yet.</p>
            <Link to="/marketplace" className="mt-4 inline-block text-sm font-medium text-primary hover:underline">
              Start shopping →
            </Link>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {orders.map((o) => {
              const color =
                o.status === "paid"
                  ? "bg-emerald-500/15 text-emerald-600"
                  : o.status === "fulfilled"
                  ? "bg-blue-500/15 text-blue-600"
                  : o.status === "disputed"
                  ? "bg-rose-500/15 text-rose-600"
                  : "bg-amber-500/15 text-amber-600";
              return (
                <div key={o.id} className="rounded-2xl border border-border bg-card p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold">Order {o.id.slice(0, 8)}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleString()} · {o.fulfillment}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${color}`}>
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
                  {o.status !== "disputed" && o.status !== "refunded" && (
                    <div className="mt-3">
                      {openingFor === o.id ? (
                        <div className="space-y-2">
                          <input
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="What went wrong?"
                            className="w-full rounded-md border border-border bg-background p-2 text-sm"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => submitDispute(o.id)}
                              className="rounded-md bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-rose-700"
                            >
                              Open dispute
                            </button>
                            <button
                              onClick={() => setOpeningFor(null)}
                              className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setOpeningFor(o.id);
                            setReason("");
                          }}
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                        >
                          <AlertTriangle className="h-3 w-3" /> Report a problem
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
