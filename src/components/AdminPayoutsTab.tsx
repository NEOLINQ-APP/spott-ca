import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listAllRedemptions, markRedemptionsPaid, listPromoters } from "@/lib/promoters.functions";
import { toast } from "sonner";
import { Loader2, Download, DollarSign } from "lucide-react";

export function AdminPayoutsTab() {
  const list = useServerFn(listAllRedemptions);
  const markPaid = useServerFn(markRedemptionsPaid);
  const fetchPromoters = useServerFn(listPromoters);

  const [rows, setRows] = useState<any[]>([]);
  const [promoters, setPromoters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [promoterFilter, setPromoterFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<"pending" | "paid" | "all">("pending");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [payoutRef, setPayoutRef] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const [r, p] = await Promise.all([
        list({ data: { promoter_id: promoterFilter || undefined, status: statusFilter } }),
        promoters.length ? Promise.resolve(promoters) : fetchPromoters({ data: { status: "approved" } }),
      ]);
      setRows(r);
      if (!promoters.length) setPromoters(p as any[]);
      setSelected(new Set());
    } catch (e: any) { toast.error(e?.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, [promoterFilter, statusFilter]);

  const totals = rows.reduce(
    (acc, r) => {
      acc.count++;
      acc.total += r.commission_cents || 0;
      if (selected.has(r.id)) acc.selected += r.commission_cents || 0;
      return acc;
    },
    { count: 0, total: 0, selected: 0 }
  );

  const toggleAll = () => {
    if (selected.size === rows.filter((r) => r.commission_status === "pending").length) setSelected(new Set());
    else setSelected(new Set(rows.filter((r) => r.commission_status === "pending").map((r) => r.id)));
  };

  const onMarkPaid = async () => {
    if (selected.size === 0) return;
    setBusy(true);
    try {
      await markPaid({ data: { ids: Array.from(selected), payout_ref: payoutRef || undefined } });
      toast.success(`Marked ${selected.size} as paid`);
      setPayoutRef("");
      refresh();
    } catch (e: any) { toast.error(e?.message); }
    finally { setBusy(false); }
  };

  const exportCsv = () => {
    const header = ["Date", "Code", "Promoter", "Company", "Business", "Addon", "Commission $", "Status", "Paid date", "Payout ref"];
    const lines = [header.join(",")];
    rows.forEach((r) => {
      lines.push([
        new Date(r.redeemed_at).toISOString(),
        r.code,
        r.promoter?.display_name ?? "",
        r.promoter?.company_name ?? "",
        r.business?.name ?? "",
        r.addon_type,
        (r.commission_cents / 100).toFixed(2),
        r.commission_status,
        r.commission_paid_at ? new Date(r.commission_paid_at).toISOString() : "",
        r.commission_payout_ref ?? "",
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `payouts-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <select value={promoterFilter} onChange={(e) => setPromoterFilter(e.target.value)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm">
          <option value="">All promoters</option>
          {promoters.map((p) => (
            <option key={p.id} value={p.id}>
              {p.display_name}{p.company_name ? ` (${p.company_name})` : ""}
            </option>
          ))}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}
          className="rounded-md border border-border bg-background px-3 py-1.5 text-sm">
          <option value="pending">Pending</option>
          <option value="paid">Paid</option>
          <option value="all">All</option>
        </select>
        <button onClick={exportCsv}
          className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted">
          <Download className="h-3.5 w-3.5" /> Export CSV
        </button>
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        <div className="ml-auto text-xs text-muted-foreground">
          {totals.count} rows · Total: <strong className="text-foreground">${(totals.total / 100).toFixed(2)}</strong>
        </div>
      </div>

      {statusFilter === "pending" && selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
          <span className="text-sm font-medium">{selected.size} selected · ${(totals.selected / 100).toFixed(2)}</span>
          <input value={payoutRef} onChange={(e) => setPayoutRef(e.target.value)}
            placeholder="Payout reference (e-transfer ID, etc.)"
            className="flex-1 min-w-[200px] rounded-md border border-border bg-background px-3 py-1.5 text-sm" />
          <button onClick={onMarkPaid} disabled={busy}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-50">
            <DollarSign className="h-3.5 w-3.5" /> Mark paid
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
            <tr>
              {statusFilter === "pending" && (
                <th className="px-3 py-2">
                  <input type="checkbox"
                    checked={selected.size > 0 && selected.size === rows.filter((r) => r.commission_status === "pending").length}
                    onChange={toggleAll} />
                </th>
              )}
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Code</th>
              <th className="px-3 py-2">Promoter</th>
              <th className="px-3 py-2">Business</th>
              <th className="px-3 py-2">Reward</th>
              <th className="px-3 py-2 text-right">Commission</th>
              <th className="px-3 py-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-border">
                {statusFilter === "pending" && (
                  <td className="px-3 py-2">
                    {r.commission_status === "pending" && (
                      <input type="checkbox" checked={selected.has(r.id)}
                        onChange={(e) => {
                          const s = new Set(selected);
                          if (e.target.checked) s.add(r.id); else s.delete(r.id);
                          setSelected(s);
                        }} />
                    )}
                  </td>
                )}
                <td className="px-3 py-2 text-xs">{new Date(r.redeemed_at).toLocaleString()}</td>
                <td className="px-3 py-2 font-mono text-xs">{r.code}</td>
                <td className="px-3 py-2 text-xs">
                  {r.promoter ? (
                    <>
                      <div>{r.promoter.display_name}</div>
                      {r.promoter.company_name && <div className="text-[10px] text-muted-foreground">{r.promoter.company_name}</div>}
                    </>
                  ) : <span className="text-muted-foreground">—</span>}
                </td>
                <td className="px-3 py-2 text-xs">{r.business?.name ?? "—"}</td>
                <td className="px-3 py-2 text-xs">{r.addon_type}</td>
                <td className="px-3 py-2 text-right font-medium">${((r.commission_cents || 0) / 100).toFixed(2)}</td>
                <td className="px-3 py-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    r.commission_status === "paid" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" :
                    r.commission_status === "pending" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" :
                    "bg-muted text-muted-foreground"
                  }`}>{r.commission_status}</span>
                  {r.commission_payout_ref && <div className="text-[10px] text-muted-foreground">{r.commission_payout_ref}</div>}
                </td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
              <tr><td colSpan={statusFilter === "pending" ? 8 : 7} className="px-4 py-8 text-center text-sm text-muted-foreground">No redemptions match.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
