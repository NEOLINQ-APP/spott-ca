import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdmin(supabase: any, userId: string) {
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
  if (!isAdmin) throw new Error("Not authorized");
}

// Public: list active sponsored listings for display in the marketplace.
export const listActiveSponsoredListings = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ limit: z.number().int().min(1).max(20).default(6) }).parse(data ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("sponsored_listings")
      .select("id,title,description,image_url,video_url,price_cents,currency,city,province,sponsor_name,cta_label")
      .eq("is_active", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

// Public: a click was registered (opened the lead form) — tracked separately
// from an actual submitted lead so admins can see interest vs. conversion.
export const trackSponsoredClick = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ sponsoredListingId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("sponsored_listings")
      .select("click_count")
      .eq("id", data.sponsoredListingId)
      .maybeSingle();
    await supabaseAdmin
      .from("sponsored_listings")
      .update({ click_count: (row?.click_count ?? 0) + 1 })
      .eq("id", data.sponsoredListingId);
    return { ok: true };
  });

const leadSchema = z.object({
  sponsoredListingId: z.string().uuid(),
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(255).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  message: z.string().trim().max(2000).optional().or(z.literal("")),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  province: z.string().trim().max(60).optional().or(z.literal("")),
});

// Public: submit interest in a sponsored listing. No anon INSERT policy
// exists on sponsored_listing_leads — this is the only write path,
// intentionally routed through the service-role client server-side.
export const submitSponsoredLead = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => leadSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: listing } = await supabaseAdmin
      .from("sponsored_listings")
      .select("id,category_id,lead_count")
      .eq("id", data.sponsoredListingId)
      .maybeSingle();
    if (!listing) throw new Error("Listing not found");

    const { error } = await supabaseAdmin.from("sponsored_listing_leads").insert({
      sponsored_listing_id: data.sponsoredListingId,
      name: data.name,
      email: data.email || null,
      phone: data.phone || null,
      message: data.message || null,
      city: data.city || null,
      province: data.province || null,
      category_id: listing.category_id,
    });
    if (error) throw new Error(error.message);

    await supabaseAdmin
      .from("sponsored_listings")
      .update({ lead_count: (listing.lead_count ?? 0) + 1 })
      .eq("id", data.sponsoredListingId);

    return { ok: true };
  });

// --- Admin CRUD ---

const sponsoredInput = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().or(z.literal("")),
  image_url: z.string().trim().url().max(1000).optional().or(z.literal("")),
  video_url: z.string().trim().url().max(1000).optional().or(z.literal("")),
  price_cents: z.number().int().min(0).optional().nullable(),
  category_id: z.string().uuid().optional().or(z.literal("")),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  province: z.string().trim().max(60).optional().or(z.literal("")),
  sponsor_name: z.string().trim().max(200).optional().or(z.literal("")),
  cta_label: z.string().trim().max(60).default("Learn more"),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().default(0),
});

export const listSponsoredListingsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("sponsored_listings")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const upsertSponsoredListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid().optional() }).and(sponsoredInput).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const row = {
      title: data.title,
      description: data.description || null,
      image_url: data.image_url || null,
      video_url: data.video_url || null,
      price_cents: data.price_cents ?? null,
      category_id: data.category_id || null,
      city: data.city || null,
      province: data.province || null,
      sponsor_name: data.sponsor_name || null,
      cta_label: data.cta_label,
      is_active: data.is_active,
      sort_order: data.sort_order,
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      const { error } = await supabaseAdmin.from("sponsored_listings").update(row).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    }
    const { data: created, error } = await supabaseAdmin
      .from("sponsored_listings")
      .insert(row)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { id: created.id };
  });

export const deleteSponsoredListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("sponsored_listings").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listSponsoredLeadsAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("sponsored_listing_leads")
      .select("*, sponsored_listings(title), marketplace_categories(name)")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

// Category interest breakdown — "what Canadians are mostly looking for".
export const sponsoredLeadInsights = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: leads } = await supabaseAdmin
      .from("sponsored_listing_leads")
      .select("category_id, city, province, marketplace_categories(name)");
    const { data: listings } = await supabaseAdmin
      .from("sponsored_listings")
      .select("id, title, click_count, lead_count")
      .order("click_count", { ascending: false });

    const byCategory = new Map<string, { name: string; count: number }>();
    const byCity = new Map<string, number>();
    for (const l of leads ?? []) {
      const catName = (l as any).marketplace_categories?.name ?? "Uncategorized";
      const catId = l.category_id ?? "none";
      const entry = byCategory.get(catId) ?? { name: catName, count: 0 };
      entry.count += 1;
      byCategory.set(catId, entry);

      if (l.city) byCity.set(l.city, (byCity.get(l.city) ?? 0) + 1);
    }

    return {
      totalLeads: (leads ?? []).length,
      byCategory: Array.from(byCategory.values()).sort((a, b) => b.count - a.count),
      byCity: Array.from(byCity.entries()).map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count),
      listings: listings ?? [],
    };
  });
