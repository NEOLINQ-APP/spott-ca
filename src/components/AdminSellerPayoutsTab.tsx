import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listOwedToSellers, listSellerPayouts, recordSellerPayout } from "@/lib/seller-payouts.functions";
import { toast } from "sonner";
import { Loader2, DollarSign, ChevronDown, ChevronRight, Download } from "lucide-react";

type SellerOwed = {
  seller_id: string;
  display_name: string | null;
  items: Array<{
    id: string;
    title: string;
    quantity: number;
    unit_price_cents: number;
    commission_cents: number;
    gross_cents: number;
    net_cents: number;
    order_id: string;
    released_at: string | null;
  }>;
  gross_cents: number;
  commission_cents: number;
  net_cents: number;
  currency: string;
};

export function AdminSellerPayoutsTab() {
  const fetchOwed = useServerFn(listOwedToSellers);
  const fetchHistory = useServerFn(listSellerPayouts);
  const recordPayout = useServerFn(recordSellerPayout);

  const [tab, setTab] = useState<"owed" | "history">("owed");
  const [loading, setLoading] = useState(false);
  const [sellers, setSellers] = useState<SellerOwed[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Record<string, Set<string>>>({});
  const [form, setForm] = useState<Record<string, { method: string; reference: string; notes: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      if (tab === "owed") {
        const r = await fetchOwed();
        setSellers(r.sellers);
      } else {
        const h = await fetchHistory({ data: {} });
        setHistory(h);
      }
    } catch (e: any) {
      toast.error(e?.message);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { refresh(); }, [tab]);

  const totalOwed = useMemo(() => sellers.reduce((s, x) => s + x.net_cents, 0), [sellers]);

  const toggleItem = (sellerId: string, itemId: string) => {
    setSelected((prev) => {
      const s = new Set(prev[sellerId] ?? []);
      if (s.has(itemId)) s.delete(itemId); else s.add(itemId);
      return { ...prev, [sellerId]: s };
    });
  };

  const selectAll = (s: SellerOwed) => {
    setSelected((prev) => ({ ...prev, [s.seller_id]: new Set(s.items.map((i) => i.id)) }));
  };

  const doPay = async (s: SellerOwed) => {
    const ids = Array.from(selected[s.seller_id] ?? []);
    if (ids.length === 0) { toast.error("Select at least one item"); return; }
    const f = form[s.seller_id] ?? { method: "", reference: "", notes: "" };
    setBusy(s.seller_id);
    try {
      await recordPayout({
        data: {
          seller_id: s.seller_id,
          item_ids: ids,
          method: f.method || undefined,
          reference: f.reference || undefined,
          notes: f.notes || undefined,
        },
      });
      toast.success("Payout recorded");
      setSelected((p) => ({ ...p, [s.seller_id]: new Set() }));
      setForm((p) => ({ ...p, [s.seller_id]: { method: "", reference: "", notes: "" } }));
      await refresh();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(null);
    }
  };

  const exportCsv = () => {
    const rows = tab === "owed"
      ? sellers.flatMap((s) => s.items.map((i) => [s.seller_id, s.display_name ?? "", i.order_id, i.title, i.quantity, i.unit_price_cents / 100, i.commission_cents / 100, i.net_cents / 100]))
      : history.map((h) => [h.id, h.seller_id, h.seller_name ?? "", h.paid_at, h.amount_cents / 100, h.currency, h.method ?? "", h.reference ?? ""]);
    const header = tab === "owed"
      ? ["seller_id","seller","order_id","title","qty","unit_price","commission","net"]
      : ["payout_id","seller_id","seller","paid_at","amount","currency","method","reference"];
    const csv = [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g,'""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `seller-${tab}-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-md border border-border overflow-hidden">
          <button onClick={() => setTab("owed")} className={`px-3 py-1.5 text-sm ${tab==="owed"?"bg-primary text-primary-foreground":"hover:bg-muted"}`}>Owed to sellers</button>
          <button onClick={() => setTab("history")} className={`px-3 py-1.5 text-sm ${tab==="history"?"bg-primary text-primary-foreground":"hover:bg-muted"}`}>Payout history</button>
        </div>
        <button onClick={exportCsv} className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        {tab === "owed" && (
          <div className="ml-auto text-sm">Total owed: <strong>${(totalOwed/100).toFixed(2)}</strong></div>
        )}
      </div>

      {tab === "owed" && (
        <div className="space-y-3">
          {sellers.length === 0 && !loading && (
            <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
              No released orders awaiting payout. Sellers get paid after buyers confirm delivery.
            </div>
          )}
          {sellers.map((s) => {
            const sel = selected[s.seller_id] ?? new Set<string>();
            const f = form[s.seller_id] ?? { method: "", reference: "", notes: "" };
            const open = expanded.has(s.seller_id);
            return (
              <div key={s.seller_id} className="rounded-xl border border-border bg-card">
                <div className="flex flex-wrap items-center gap-3 p-3">
                  <button onClick={() => {
                    const nx = new Set(expanded);
                    nx.has(s.seller_id) ? nx.delete(s.seller_id) : nx.add(s.seller_id);
                    setExpanded(nx);
                  }} className="text-muted-foreground hover:text-foreground">
                    {open ? <ChevronDown className="h-4 w-4"/> : <ChevronRight className="h-4 w-4"/>}
                  </button>
                  <div className="flex-1 min-w-[180px]">
                    <div className="font-medium">{s.display_name ?? "Unknown seller"}</div>
                    <div className="text-xs text-muted-foreground font-mono">{s.seller_id.slice(0,8)}…</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{s.items.length} item{s.items.length===1?"":"s"}</div>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">Net owed</div>
                    <div className="text-lg font-semibold">${(s.net_cents/100).toFixed(2)} <span className="text-xs text-muted-foreground">{s.currency}</span></div>
                  </div>
                </div>
                {open && (
                  <div className="border-t border-border p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => selectAll(s)} className="text-xs underline text-muted-foreground hover:text-foreground">Select all</button>
                      <span className="text-xs text-muted-foreground">{sel.size} selected</span>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                          <tr>
                            <th className="px-3 py-2 w-8"></th>
                            <th className="px-3 py-2">Item</th>
                            <th className="px-3 py-2">Order</th>
                            <th className="px-3 py-2">Released</th>
                            <th className="px-3 py-2 text-right">Gross</th>
                            <th className="px-3 py-2 text-right">Comm.</th>
                            <th className="px-3 py-2 text-right">Net</th>
                          </tr>
                        </thead>
                        <tbody>
                          {s.items.map((i) => (
                            <tr key={i.id} className="border-t border-border">
                              <td className="px-3 py-2"><input type="checkbox" checked={sel.has(i.id)} onChange={() => toggleItem(s.seller_id, i.id)} /></td>
                              <td className="px-3 py-2">{i.title} {i.quantity > 1 && <span className="text-xs text-muted-foreground">× {i.quantity}</span>}</td>
                              <td className="px-3 py-2 font-mono text-xs">{i.order_id.slice(0,8)}…</td>
                              <td className="px-3 py-2 text-xs">{i.released_at ? new Date(i.released_at).toLocaleDateString() : "—"}</td>
                              <td className="px-3 py-2 text-right">${(i.gross_cents/100).toFixed(2)}</td>
                              <td className="px-3 py-2 text-right text-muted-foreground">${(i.commission_cents/100).toFixed(2)}</td>
                              <td className="px-3 py-2 text-right font-medium">${(i.net_cents/100).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-3">
                      <select value={f.method} onChange={(e) => setForm((p) => ({ ...p, [s.seller_id]: { ...f, method: e.target.value } }))}
                        className="rounded-md border border-border bg-background px-3 py-1.5 text-sm">
                        <option value="">Method…</option>
                        <option value="etransfer">E-transfer</option>
                        <option value="bank">Bank</option>
                        <option value="paypal">PayPal</option>
                        <option value="stripe">Stripe</option>
                        <option value="cash">Cash</option>
                        <option value="other">Other</option>
                      </select>
                      <input value={f.reference} onChange={(e) => setForm((p) => ({ ...p, [s.seller_id]: { ...f, reference: e.target.value } }))}
                        placeholder="Reference (txn ID)" className="rounded-md border border-border bg-background px-3 py-1.5 text-sm" />
                      <input value={f.notes} onChange={(e) => setForm((p) => ({ ...p, [s.seller_id]: { ...f, notes: e.target.value } }))}
                        placeholder="Notes (optional)" className="rounded-md border border-border bg-background px-3 py-1.5 text-sm" />
                    </div>
                    <button onClick={() => doPay(s)} disabled={busy === s.seller_id || sel.size === 0}
                      className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
                      {busy === s.seller_id ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <DollarSign className="h-3.5 w-3.5"/>}
                      Mark {sel.size || 0} item{sel.size===1?"":"s"} paid
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {tab === "history" && (
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Paid</th>
                <th className="px-3 py-2">Seller</th>
                <th className="px-3 py-2">Items</th>
                <th className="px-3 py-2">Method</th>
                <th className="px-3 py-2">Reference</th>
                <th className="px-3 py-2 text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {history.map((h) => (
                <tr key={h.id} className="border-t border-border">
                  <td className="px-3 py-2 text-xs">{new Date(h.paid_at).toLocaleString()}</td>
                  <td className="px-3 py-2">{h.seller_name ?? <span className="font-mono text-xs">{h.seller_id.slice(0,8)}…</span>}</td>
                  <td className="px-3 py-2">{h.item_count}</td>
                  <td className="px-3 py-2 text-xs">{h.method ?? "—"}</td>
                  <td className="px-3 py-2 text-xs">{h.reference ?? "—"}</td>
                  <td className="px-3 py-2 text-right font-medium">${(h.amount_cents/100).toFixed(2)} {h.currency}</td>
                </tr>
              ))}
              {history.length === 0 && !loading && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">No payouts recorded yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
