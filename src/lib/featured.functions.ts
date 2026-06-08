import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const FEATURED_SECTIONS = [
  { value: "businesses", label: "Featured Businesses" },
  { value: "services", label: "Featured Services" },
  { value: "restaurants", label: "Featured Restaurants" },
  { value: "realtors", label: "Featured Realtors" },
  { value: "dealerships", label: "Featured Dealerships" },
] as const;

export const FEATURED_TIERS = [
  { value: "featured", label: "Featured Business", price: 19 },
  { value: "featured_plus", label: "Featured Plus", price: 49 },
  { value: "premium_featured", label: "Premium Featured", price: 99 },
] as const;

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Admin only");
}

/** Public: list active featured businesses for a homepage section. */
export const listFeaturedBusinesses = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z.object({
      section: z.enum(["businesses", "services", "restaurants", "realtors", "dealerships"]),
      limit: z.number().min(1).max(24).default(8),
    }).parse(i),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("businesses")
      .select("id, slug, name, description, city, province, hero_image_url, business_type, featured_until, featured_priority, featured_tier")
      .eq("status", "approved")
      .gt("featured_until", new Date().toISOString())
      .contains("featured_sections", [data.section])
      .order("featured_priority", { ascending: false })
      .order("featured_until", { ascending: false })
      .limit(data.limit);
    return { rows: rows ?? [] };
  });

/** Authenticated owner: submit an application for featured placement. */
export const requestFeaturedPlacement = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      business_id: z.string().uuid(),
      requested_tier: z.enum(["featured", "featured_plus", "premium_featured"]).default("featured"),
      requested_sections: z.array(z.string().min(1).max(40)).min(1).max(5),
      message: z.string().max(1000).optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    // Verify ownership
    const { data: biz } = await supabase
      .from("businesses").select("id, owner_id").eq("id", data.business_id).maybeSingle();
    if (!biz || biz.owner_id !== userId) throw new Error("You don't own this business");

    const { error } = await supabase.from("business_feature_requests").insert({
      user_id: userId,
      business_id: data.business_id,
      requested_tier: data.requested_tier,
      requested_sections: data.requested_sections,
      message: data.message ?? null,
      status: "pending",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Authenticated owner: list their businesses + featured status. */
export const myBusinessesWithFeatured = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: businesses } = await supabase
      .from("businesses")
      .select("id, slug, name, city, province, hero_image_url, featured_until, featured_priority, featured_tier, featured_sections")
      .eq("owner_id", userId);
    const { data: requests } = await supabase
      .from("business_feature_requests")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    return { businesses: businesses ?? [], requests: requests ?? [] };
  });

/** Admin: list feature requests. */
export const adminListFeatureRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      status: z.enum(["pending", "approved", "rejected", "all"]).default("pending"),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("business_feature_requests")
      .select("*, businesses:business_id(name, slug, city, province, business_type, hero_image_url)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows } = await q;
    return { rows: rows ?? [] };
  });

/** Admin: approve or reject a feature request (does NOT auto-set featured_until — admin uses setBusinessFeatured). */
export const adminReviewFeatureRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      id: z.string().uuid(),
      action: z.enum(["approve", "reject"]),
      notes: z.string().max(1000).optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("business_feature_requests")
      .update({
        status: data.action === "approve" ? "approved" : "rejected",
        admin_notes: data.notes ?? null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: context.userId,
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: directly set/remove featured placement on a business. */
export const adminSetBusinessFeatured = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      business_id: z.string().uuid(),
      tier: z.enum(["featured", "featured_plus", "premium_featured"]).nullable(),
      sections: z.array(z.string().min(1).max(40)).max(5),
      priority: z.number().int().min(0).max(1000).default(0),
      featured_until: z.string().datetime().nullable(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("businesses")
      .update({
        featured_tier: data.tier,
        featured_sections: data.sections,
        featured_priority: data.priority,
        featured_until: data.featured_until,
      })
      .eq("id", data.business_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Admin: search businesses (for the manual featured selector). */
export const adminSearchBusinessesForFeatured = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      search: z.string().trim().max(120).optional(),
      featured_only: z.boolean().default(false),
      limit: z.number().min(1).max(100).default(40),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("businesses")
      .select("id, slug, name, city, province, business_type, hero_image_url, featured_until, featured_priority, featured_tier, featured_sections")
      .eq("status", "approved")
      .order("featured_priority", { ascending: false })
      .order("name", { ascending: true })
      .limit(data.limit);
    if (data.featured_only) q = q.gt("featured_until", new Date().toISOString());
    if (data.search) {
      const s = data.search.replace(/[%_]/g, "\\$&");
      q = q.ilike("name", `%${s}%`);
    }
    const { data: rows } = await q;
    return { rows: rows ?? [] };
  });
