import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { createCoupon, listCoupons, revokeCoupon } from "@/lib/coupons.functions";
import { listPromoters } from "@/lib/promoters.functions";
import { toast } from "sonner";
import { Loader2, Copy, Ban, Plus, Ticket } from "lucide-react";

const ADDON_LABELS: Record<string, string> = {
  spott_extra_tags: "Extra Tags (30d, +8 tags)",
  spott_bump_up_once: "Bump to top (24h)",
  spott_feature_7d_once: "Homepage feature (7d)",
  spott_photo_pack_once: "+10 photo pack",
  spott_pro_month: "1 month Pro",
  spott_business_month: "1 month Business",
};

type UsageMode = "single" | "limited" | "unlimited";

export function AdminCouponsTab() {
  const create = useServerFn(createCoupon);
  const list = useServerFn(listCoupons);
  const revoke = useServerFn(revokeCoupon);
  const fetchPromoters = useServerFn(listPromoters);

  const [rows, setRows] = useState<any[]>([]);
  const [promoters, setPromoters] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const [addonType, setAddonType] = useState("spott_extra_tags");
  const [notes, setNotes] = useState("");
  const [expiresDays, setExpiresDays] = useState<string>("30");
  const [customCode, setCustomCode] = useState("");
  const [usageMode, setUsageMode] = useState<UsageMode>("single");
  const [maxUses, setMaxUses] = useState<string>("100");
  const [promoterId, setPromoterId] = useState<string>("");
  const [discountKind, setDiscountKind] = useState<"addon_grant" | "percent_off">("addon_grant");
  const [percentOff, setPercentOff] = useState<string>("10");

  const refresh = async () => {
    setLoading(true);
    try {
      const [c, p] = await Promise.all([list(), fetchPromoters({ data: { status: "approved" } })]);
      setRows(c);
      setPromoters(p);
    } catch (e: any) {
      toast.error(e?.message || "Failed to load coupons");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy("create");
    try {
      const max_uses = usageMode === "single" ? 1 : usageMode === "unlimited" ? null : Math.max(1, parseInt(maxUses) || 1);
      const row = await create({
        data: {
          addon_type: addonType as any,
          notes: notes || undefined,
          expires_in_days: expiresDays ? Number(expiresDays) : undefined,
          code: customCode.trim() || undefined,
          max_uses,
          promoter_id: promoterId || null,
          discount_kind: discountKind,
          discount_value: discountKind === "percent_off" ? Number(percentOff) : undefined,
        },
      });
      toast.success(`Created code: ${row.code}`);
      setCustomCode("");
      setNotes("");
      refresh();
    } catch (e: any) {
      toast.error(e?.message || "Could not create coupon");
    } finally {
      setBusy(null);
    }
  };

  const onRevoke = async (id: string) => {
    if (!confirm("Revoke this coupon? It will no longer be redeemable.")) return;
    setBusy(id);
    try {
      await revoke({ data: { id } });
      toast.success("Coupon revoked");
      refresh();
    } catch (e: any) {
      toast.error(e?.message);
    } finally {
      setBusy(null);
    }
  };

  const copy = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Copied ${code}`);
  };

  return (
    <div className="space-y-6">
      <form onSubmit={onCreate} className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold">
          <Plus className="h-4 w-4" /> Generate new coupon
        </h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-xs">
            <span className="mb-1 block font-medium text-muted-foreground">Reward</span>
            <select value={addonType} onChange={(e) => setAddonType(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
              {Object.entries(ADDON_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>

          <label className="text-xs">
            <span className="mb-1 block font-medium text-muted-foreground">Usage limit</span>
            <select value={usageMode} onChange={(e) => setUsageMode(e.target.value as UsageMode)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
              <option value="single">Single-use (1 business)</option>
              <option value="limited">Limited uses</option>
              <option value="unlimited">Unlimited</option>
            </select>
          </label>

          {usageMode === "limited" && (
            <label className="text-xs">
              <span className="mb-1 block font-medium text-muted-foreground">Max uses</span>
              <input type="number" min="1" max="100000" value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
            </label>
          )}

          <label className="text-xs">
            <span className="mb-1 block font-medium text-muted-foreground">Expires (days)</span>
            <input type="number" min="1" max="3650" value={expiresDays}
              onChange={(e) => setExpiresDays(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </label>

          <label className="text-xs">
            <span className="mb-1 block font-medium text-muted-foreground">Custom code</span>
            <input value={customCode}
              onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
              placeholder="Auto-generated if blank"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-mono" />
          </label>

          <label className="text-xs">
            <span className="mb-1 block font-medium text-muted-foreground">Attribute to promoter</span>
            <select value={promoterId} onChange={(e) => setPromoterId(e.target.value)}
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm">
              <option value="">— None —</option>
              {promoters.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.display_name}{p.company_name ? ` (${p.company_name})` : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs sm:col-span-2 lg:col-span-3">
            <span className="mb-1 block font-medium text-muted-foreground">Notes</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Holiday promo, influencer @joesmith"
              className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm" />
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <button type="submit" disabled={busy === "create"}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
            {busy === "create" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
            Generate code
          </button>
        </div>
      </form>

      <div className="rounded-xl border border-border bg-card">
        <div className="border-b border-border px-5 py-3 text-sm font-semibold">
          All coupons {loading && <Loader2 className="ml-2 inline h-3 w-3 animate-spin" />}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2">Reward</th>
                <th className="px-4 py-2">Uses</th>
                <th className="px-4 py-2">Promoter</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Expires</th>
                <th className="px-4 py-2">Notes</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-2">
                    <button onClick={() => copy(r.code)} className="inline-flex items-center gap-1.5 font-mono font-semibold hover:text-primary">
                      {r.code} <Copy className="h-3 w-3" />
                    </button>
                  </td>
                  <td className="px-4 py-2">{ADDON_LABELS[r.addon_type] ?? r.addon_type}</td>
                  <td className="px-4 py-2 text-xs">
                    {r.uses_count ?? 0}{r.max_uses == null ? " / ∞" : ` / ${r.max_uses}`}
                    {r.last_redeemed_at && <div className="text-[10px] text-muted-foreground">Last: {new Date(r.last_redeemed_at).toLocaleDateString()}</div>}
                  </td>
                  <td className="px-4 py-2 text-xs">
                    {r.promoter ? (
                      <>
                        <div>{r.promoter.display_name}</div>
                        {r.promoter.company_name && <div className="text-[10px] text-muted-foreground">{r.promoter.company_name}</div>}
                      </>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      r.status === "active" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" :
                      r.status === "redeemed" || r.status === "exhausted" ? "bg-blue-500/15 text-blue-700 dark:text-blue-400" :
                      "bg-muted text-muted-foreground"
                    }`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {r.expires_at ? new Date(r.expires_at).toLocaleDateString() : "—"}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{r.notes || "—"}</td>
                  <td className="px-4 py-2 text-right">
                    {r.status === "active" && (
                      <button onClick={() => onRevoke(r.id)} disabled={busy === r.id}
                        className="inline-flex items-center gap-1 text-xs text-destructive hover:underline disabled:opacity-50">
                        <Ban className="h-3 w-3" /> Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {rows.length === 0 && !loading && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-sm text-muted-foreground">No coupons yet. Create one above.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
