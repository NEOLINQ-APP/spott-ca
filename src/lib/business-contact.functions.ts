import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const Input = z.object({
  business_id: z.string().uuid(),
  address: z.string().trim().max(255).nullable().optional(),
  city: z.string().trim().max(120).nullable().optional(),
  province: z.string().trim().max(40).nullable().optional(),
  postal_code: z.string().trim().max(20).nullable().optional(),
  phone: z.string().trim().max(40).nullable().optional(),
  email: z.string().trim().email().max(255).nullable().optional().or(z.literal("")),
  website: z.string().trim().url().max(500).nullable().optional().or(z.literal("")),
});

async function geocode(address: string): Promise<{ lat: number; lng: number } | null> {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
  if (!LOVABLE_API_KEY || !GOOGLE_MAPS_API_KEY) return null;
  try {
    const res = await fetch(
      `https://connector-gateway.lovable.dev/google_maps/maps/api/geocode/json?address=${encodeURIComponent(address)}`,
      {
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "X-Connection-Api-Key": GOOGLE_MAPS_API_KEY,
        },
      },
    );
    const data: any = await res.json();
    const loc = data?.results?.[0]?.geometry?.location;
    if (loc?.lat != null && loc?.lng != null) return { lat: loc.lat, lng: loc.lng };
  } catch {
    /* fall through */
  }
  return null;
}

export const updateBusinessContact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: biz, error: bErr } = await supabase
      .from("businesses")
      .select("id, owner_id, address, city, province, postal_code")
      .eq("id", data.business_id)
      .maybeSingle();
    if (bErr || !biz) throw new Error("Business not found");
    if (biz.owner_id !== userId) {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
      if (!isAdmin) throw new Error("Not authorized");
    }

    const normalize = (v: string | null | undefined) => {
      if (v === undefined) return undefined;
      const t = (v ?? "").trim();
      return t.length === 0 ? null : t;
    };

    const patch: Record<string, any> = {
      address: normalize(data.address),
      city: normalize(data.city),
      province: normalize(data.province),
      postal_code: normalize(data.postal_code),
      phone: normalize(data.phone),
      email: normalize(data.email),
      website: normalize(data.website),
    };

    // Re-geocode whenever any address component changed.
    const addressChanged =
      (patch.address ?? null) !== (biz.address ?? null) ||
      (patch.city ?? null) !== (biz.city ?? null) ||
      (patch.province ?? null) !== (biz.province ?? null) ||
      (patch.postal_code ?? null) !== (biz.postal_code ?? null);

    if (addressChanged) {
      const full = [patch.address, patch.city, patch.province, patch.postal_code]
        .filter(Boolean)
        .join(", ");
      if (full.length > 0) {
        const loc = await geocode(full);
        if (loc) {
          patch.latitude = loc.lat;
          patch.longitude = loc.lng;
        }
      } else {
        patch.latitude = null;
        patch.longitude = null;
      }
    }

    const { error } = await (supabase.from("businesses") as any).update(patch).eq("id", data.business_id);
    if (error) throw new Error(error.message);
    return { ok: true, geocoded: addressChanged };
  });
