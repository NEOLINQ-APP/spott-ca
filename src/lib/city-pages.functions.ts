import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const schema = z.object({
  city: z.string().min(1).max(120),
  province: z.string().min(2).max(2),
});

export interface CityBusiness {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  province: string | null;
  description: string | null;
  hero_image_url: string | null;
  is_featured: boolean;
  is_verified: boolean;
}

export interface CityPageData {
  total: number;
  featured: CityBusiness[];
  businesses: CityBusiness[];
  topCategories: { slug: string; name: string; count: number }[];
}

export const getCityPageData = createServerFn({ method: "GET" })
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data }): Promise<CityPageData> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch up to 60 approved businesses for this city (sorted: featured first).
    const { data: rows, count } = await supabaseAdmin
      .from("businesses")
      .select(
        "id,slug,name,city,province,description,hero_image_url,featured_until,featured_priority,is_claimed,category_id",
        { count: "exact" },
      )
      .eq("status", "approved")
      .ilike("city", data.city)
      .eq("province", data.province)
      .order("featured_priority", { ascending: false, nullsFirst: false })
      .order("featured_until", { ascending: false, nullsFirst: false })
      .order("name", { ascending: true })
      .limit(60);

    const now = Date.now();
    const all: CityBusiness[] = (rows ?? []).map((b: any) => ({
      id: b.id,
      slug: b.slug,
      name: b.name,
      city: b.city,
      province: b.province,
      description: b.description,
      hero_image_url: b.hero_image_url,
      is_featured: !!(b.featured_until && new Date(b.featured_until).getTime() > now),
      is_verified: !!b.is_claimed,
    }));

    const featured = all.filter((b) => b.is_featured).slice(0, 6);

    // Top categories in this city
    const categoryCounts = new Map<string, number>();
    for (const r of rows ?? []) {
      if (r.category_id) {
        categoryCounts.set(r.category_id, (categoryCounts.get(r.category_id) ?? 0) + 1);
      }
    }
    let topCategories: { slug: string; name: string; count: number }[] = [];
    if (categoryCounts.size) {
      const { data: cats } = await supabaseAdmin
        .from("categories")
        .select("id,slug,name")
        .in("id", Array.from(categoryCounts.keys()));
      topCategories = (cats ?? [])
        .map((c: any) => ({
          slug: c.slug,
          name: c.name,
          count: categoryCounts.get(c.id) ?? 0,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 8);
    }

    return {
      total: count ?? all.length,
      featured,
      businesses: all,
      topCategories,
    };
  });
