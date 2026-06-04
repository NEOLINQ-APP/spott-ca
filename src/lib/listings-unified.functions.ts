// Unified listing query — pulls from both `marketplace_listings` and
// `vehicles` and returns BaseListing[]. Public read; uses supabaseAdmin
// inside the handler to avoid hitting auth on shareable pages.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  type BaseListing,
  marketplaceRowToListing,
  vehicleRowToListing,
} from "./listing-schema";

const ListInput = z.object({
  q: z.string().trim().max(120).optional(),
  kind: z.enum(["all", "marketplace", "vehicle"]).default("all"),
  limit: z.number().int().min(1).max(60).default(24),
});

export const listUnifiedListings = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => ListInput.parse(input ?? {}))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const out: BaseListing[] = [];

    if (data.kind === "all" || data.kind === "marketplace") {
      let q = supabaseAdmin
        .from("marketplace_listings")
        .select(
          "id,title,description,price_cents,currency,city,province,postal_code,status,listing_type,user_id,created_at,category_id,marketplace_listing_photos(storage_path,sort_order)",
        )
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(data.limit);
      if (data.q) q = q.ilike("title", `%${data.q}%`);
      const { data: rows, error } = await q;
      if (error) throw new Error(error.message);
      for (const r of rows ?? []) out.push(marketplaceRowToListing(r as any));
    }

    if (data.kind === "all" || data.kind === "vehicle") {
      let q = supabaseAdmin
        .from("vehicles")
        .select(
          "id,title,description,year,make,model,trim,price_cents,currency,mileage_km,city,province,postal_code,status,seller_id,seller_type,condition,transmission,fuel_type,drivetrain,body_type,exterior_color,vin,created_at,dealer_business_id,dealer:businesses!vehicles_dealer_business_id_fkey(id,name,slug,city,province),vehicle_photos(storage_path,sort_order)",
        )
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(data.limit);
      if (data.q) q = q.ilike("title", `%${data.q}%`);
      const { data: rows, error } = await q;
      if (error) throw new Error(error.message);
      for (const r of rows ?? []) out.push(vehicleRowToListing(r as any));
    }

    out.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
    return { listings: out.slice(0, data.limit) };
  });
