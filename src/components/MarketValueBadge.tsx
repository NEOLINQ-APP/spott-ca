import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { TrendingDown, TrendingUp, Equal } from "lucide-react";
import { getVehicleMarketValue, type MarketValue } from "@/lib/vehicle-market.functions";

function fmt(cents: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(cents / 100);
}

export function MarketValueBadge({
  vehicleId,
  make,
  model,
  year,
  priceCents,
}: {
  vehicleId: string;
  make: string | null | undefined;
  model: string | null | undefined;
  year: number | null | undefined;
  priceCents: number;
}) {
  const fetchMv = useServerFn(getVehicleMarketValue);
  const [mv, setMv] = useState<MarketValue | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!make || !model || !priceCents) { setLoaded(true); return; }
    fetchMv({ data: { id: vehicleId, make, model, year: year ?? null, price_cents: priceCents } })
      .then((r) => { if (!cancelled) { setMv(r); setLoaded(true); } })
      .catch(() => { if (!cancelled) setLoaded(true); });
    return () => { cancelled = true; };
  }, [vehicleId, make, model, year, priceCents, fetchMv]);

  if (!loaded || !mv) return null;

  const absDelta = Math.abs(mv.delta_cents);
  const pct = Math.abs(Math.round(mv.delta_pct * 100));
  if (mv.verdict === "below") {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300">
        <TrendingDown className="h-3.5 w-3.5" />
        {fmt(absDelta)} below market
        <span className="font-normal opacity-70">· {pct}% · {mv.sample_size} comps</span>
      </div>
    );
  }
  if (mv.verdict === "above") {
    return (
      <div className="inline-flex items-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
        <TrendingUp className="h-3.5 w-3.5" />
        {fmt(absDelta)} above market
        <span className="font-normal opacity-70">· {pct}% · {mv.sample_size} comps</span>
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-1.5 rounded-md border border-border bg-muted px-2.5 py-1 text-xs font-semibold text-foreground">
      <Equal className="h-3.5 w-3.5" /> Priced near market
      <span className="font-normal opacity-70">· {mv.sample_size} comps</span>
    </div>
  );
}
