import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MousePointerClick, CalendarCheck } from "lucide-react";

type Stats = { total: number; last7: number; last30: number; lastClickAt: string | null };

export function BookingStatsPanel({ businessId, businessName }: { businessId: string; businessName?: string }) {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const d7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const d30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const [{ count: total }, { count: c7 }, { count: c30 }, { data: latest }] = await Promise.all([
        supabase.from("booking_clicks").select("id", { count: "exact", head: true }).eq("business_id", businessId),
        supabase.from("booking_clicks").select("id", { count: "exact", head: true }).eq("business_id", businessId).gte("clicked_at", d7),
        supabase.from("booking_clicks").select("id", { count: "exact", head: true }).eq("business_id", businessId).gte("clicked_at", d30),
        supabase.from("booking_clicks").select("clicked_at").eq("business_id", businessId).order("clicked_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setStats({
        total: total ?? 0,
        last7: c7 ?? 0,
        last30: c30 ?? 0,
        lastClickAt: (latest as any)?.clicked_at ?? null,
      });
    })();
  }, [businessId]);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-display text-lg font-semibold flex items-center gap-2">
        <CalendarCheck className="h-4 w-4 text-primary" /> Booking button clicks
        {businessName && <span className="text-xs font-normal text-muted-foreground">· {businessName}</span>}
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        How many times customers tapped your Book / Reserve button on the listing page.
      </p>
      <div className="mt-4 grid grid-cols-3 gap-3">
        <Stat label="All time" value={stats?.total ?? 0} />
        <Stat label="Last 7 days" value={stats?.last7 ?? 0} />
        <Stat label="Last 30 days" value={stats?.last30 ?? 0} />
      </div>
      {stats?.lastClickAt && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <MousePointerClick className="h-3.5 w-3.5" /> Last click {new Date(stats.lastClickAt).toLocaleString()}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-3 text-center">
      <div className="font-display text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
