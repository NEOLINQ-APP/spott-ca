// Server-only dedup checks against existing businesses.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { distanceMeters } from "./normalize";

export type DedupResult = { businessId: string; reason: string } | null;

export async function findDuplicate(staged: {
  phone_normalized: string | null;
  website_host: string | null;
  name: string;
  latitude: number | null;
  longitude: number | null;
  city: string | null;
}): Promise<DedupResult> {
  // 1) Phone match
  if (staged.phone_normalized) {
    const { data } = await supabaseAdmin
      .from("businesses")
      .select("id")
      .eq("phone_normalized", staged.phone_normalized)
      .limit(1);
    if (data && data[0]) return { businessId: data[0].id, reason: "phone" };
  }
  // 2) Website host match
  if (staged.website_host) {
    const { data } = await supabaseAdmin
      .from("businesses")
      .select("id")
      .eq("website_host", staged.website_host)
      .limit(1);
    if (data && data[0]) return { businessId: data[0].id, reason: "website" };
  }
  // 3) Fuzzy name + within 150m
  if (staged.latitude != null && staged.longitude != null) {
    const { data } = await supabaseAdmin
      .from("businesses")
      .select("id,name,latitude,longitude")
      .eq("city", staged.city ?? "")
      .ilike("name", `%${staged.name.slice(0, Math.min(staged.name.length, 12))}%`)
      .limit(20);
    for (const b of data ?? []) {
      if (b.latitude == null || b.longitude == null) continue;
      const d = distanceMeters(
        { lat: staged.latitude, lng: staged.longitude },
        { lat: Number(b.latitude), lng: Number(b.longitude) },
      );
      if (d < 150) return { businessId: b.id, reason: `geo+name (${Math.round(d)}m)` };
    }
  }
  return null;
}
