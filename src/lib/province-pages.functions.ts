// SEO location pages, province level. Same live-data approach as
// city-pages.functions.ts's getCityPageData — the shell (province list)
// is a static reference table, the content is real, queried counts.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { CITIES } from "@/lib/canadian-cities";

const schema = z.object({ province: z.string().min(2).max(2) });

export interface ProvincePageData {
  business_count: number;
  vehicle_count: number;
  financing_leads_count: number;
  cities: { name: string; slug: string; business_count: number }[];
}

export const getProvincePageData = createServerFn({ method: "GET" })
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data }): Promise<ProvincePageData> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ count: businessCount }, { count: vehicleCount }, { count: leadsCount }] = await Promise.all([
      supabaseAdmin.from("businesses").select("id", { count: "exact", head: true }).eq("status", "approved").eq("province", data.province),
      supabaseAdmin.from("vehicles").select("id", { count: "exact", head: true }).eq("status", "active").eq("province", data.province),
      supabaseAdmin.from("financing_applications").select("id", { count: "exact", head: true }).eq("province", data.province),
    ]);

    const citiesInProvince = CITIES.filter((c) => c.province === data.province);
    const cityBusinessCounts = await Promise.all(
      citiesInProvince.slice(0, 20).map(async (c) => {
        const { count } = await supabaseAdmin
          .from("businesses")
          .select("id", { count: "exact", head: true })
          .eq("status", "approved")
          .eq("province", data.province)
          .ilike("city", c.name);
        return { name: c.name, count: count ?? 0 };
      }),
    );

    return {
      business_count: businessCount ?? 0,
      vehicle_count: vehicleCount ?? 0,
      financing_leads_count: leadsCount ?? 0,
      cities: cityBusinessCounts
        .map((c) => ({
          name: c.name,
          slug: `${c.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${data.province.toLowerCase()}`,
          business_count: c.count,
        }))
        .sort((a, b) => b.business_count - a.business_count),
    };
  });
