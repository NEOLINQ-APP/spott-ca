import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Receipt, Rocket, Star, ImagePlus, History } from "lucide-react";

type Row = {
  id: string;
  business_id: string | null;
  addon_type: string;
  amount_cents: number | null;
  currency: string | null;
  status: string;
  applied_at: string | null;
  expires_at: string | null;
  created_at: string;
};

const META: Record<string, { label: string; icon: any }> = {
  spott_bump_up_once: { label: "24h Bump-up", icon: Rocket },
  spott_feature_7d_once: { label: "7-day Homepage Feature", icon: Star },
  spott_photo_pack_once: { label: "+10 Photo Pack", icon: ImagePlus },
};

export function AddonHistoryPanel({ businessIds }: { businessIds: string[] }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [bizNames, setBizNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!businessIds.length) { setLoading(false); return; }
    (async () => {
      const [{ data: purchases }, { data: bizz }] = await Promise.all([
        supabase
          .from("addon_purchases")
          .select("id,business_id,addon_type,amount_cents,currency,status,applied_at,expires_at,created_at")
          .in("business_id", businessIds)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("businesses").select("id,name").in("id", businessIds),
      ]);
      setRows((purchases ?? []) as Row[]);
      const map: Record<string, string> = {};
      for (const b of bizz ?? []) map[(b as any).id] = (b as any).name;
      setBizNames(map);
      setLoading(false);
    })();
  }, [businessIds.join(",")]);

  if (loading) return <div className="h-32 animate-pulse rounded-2xl bg-card/60" />;

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-display text-lg font-semibold flex items-center gap-2">
        <Receipt className="h-4 w-4 text-primary" /> Add-on purchase history
      </h3>
      {rows.length === 0 ? (
        <div className="mt-4 rounded-md border border-dashed border-border bg-background/40 p-6 text-center text-xs text-muted-foreground">
          <History className="mx-auto mb-2 h-5 w-5" />
          No add-on purchases yet. Use the Boost panel above to bump a listing, feature it on the homepage, or unlock more photos.
        </div>
      ) : (
        <ul className="mt-3 divide-y divide-border/60">
          {rows.map((r) => {
            const meta = META[r.addon_type] ?? { label: r.addon_type, icon: Receipt };
            const Icon = meta.icon;
            const expired = r.expires_at ? new Date(r.expires_at) < new Date() : false;
            const active = r.expires_at && !expired;
            return (
              <li key={r.id} className="flex flex-wrap items-center gap-3 py-3">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {meta.label}
                    {active && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-600 dark:text-emerald-400">Active</span>}
                    {expired && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">Expired</span>}
                    {r.status === "completed" && !r.expires_at && <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-600 dark:text-emerald-400">Applied</span>}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {r.business_id && bizNames[r.business_id] ? `${bizNames[r.business_id]} · ` : ""}
                    Purchased {new Date(r.created_at).toLocaleDateString()}
                    {r.expires_at && ` · ${expired ? "Expired" : "Expires"} ${new Date(r.expires_at).toLocaleString()}`}
                  </div>
                </div>
                {r.amount_cents != null && (
                  <div className="text-sm font-semibold tabular-nums">
                    ${(r.amount_cents / 100).toFixed(2)} {(r.currency ?? "usd").toUpperCase()}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
