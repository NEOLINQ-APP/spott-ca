import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const Input = z.object({
  id: z.string().uuid(),
  make: z.string().min(1).max(60),
  model: z.string().min(1).max(60),
  year: z.number().int().min(1900).max(2100).nullable().optional(),
  price_cents: z.number().int().min(0),
});

export type MarketValue = {
  sample_size: number;
  median_cents: number;
  delta_cents: number; // listing - median (negative = below market)
  delta_pct: number; // delta / median
  verdict: "below" | "near" | "above";
};

// Compare a vehicle's price against the median of other active listings for
// the same make/model within +/-1 year. Returns null when there aren't enough
// comparables (need at least 3 others) so the UI can hide the badge.
export const getVehicleMarketValue = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => Input.parse(d))
  .handler(async ({ data }): Promise<MarketValue | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("vehicles")
      .select("price_cents,year")
      .eq("status", "active")
      .ilike("make", data.make)
      .ilike("model", data.model)
      .neq("id", data.id)
      .gt("price_cents", 0)
      .limit(200);
    if (data.year != null) {
      q = q.gte("year", data.year - 1).lte("year", data.year + 1);
    }
    const { data: rows, error } = await q;
    if (error) return null;
    const prices = (rows ?? []).map((r) => r.price_cents).filter((n) => typeof n === "number" && n > 0).sort((a, b) => a - b);
    if (prices.length < 3) return null;
    const mid = Math.floor(prices.length / 2);
    const median = prices.length % 2 ? prices[mid] : Math.round((prices[mid - 1] + prices[mid]) / 2);
    const delta = data.price_cents - median;
    const pct = delta / median;
    const verdict: MarketValue["verdict"] = pct <= -0.05 ? "below" : pct >= 0.05 ? "above" : "near";
    return {
      sample_size: prices.length,
      median_cents: median,
      delta_cents: delta,
      delta_pct: pct,
      verdict,
    };
  });
