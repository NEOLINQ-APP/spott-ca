import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const SUBSCRIBER_CATEGORIES = [
  { value: "individual", label: "Individual" },
  { value: "business", label: "Business" },
  { value: "dealership", label: "Dealership" },
  { value: "realtor", label: "Realtor" },
  { value: "service_provider", label: "Service Provider" },
  { value: "employer", label: "Employer" },
  { value: "influencer", label: "Influencer / Content Creator" },
  { value: "podcaster", label: "Podcaster" },
  { value: "event_organizer", label: "Event Organizer" },
] as const;

export const CANADIAN_PROVINCES = [
  "Alberta", "British Columbia", "Manitoba", "New Brunswick",
  "Newfoundland and Labrador", "Northwest Territories", "Nova Scotia",
  "Nunavut", "Ontario", "Prince Edward Island", "Quebec",
  "Saskatchewan", "Yukon",
];

export const INTEREST_OPTIONS = [
  "Local Businesses", "Restaurants & Food", "Real Estate", "Vehicles & Auto",
  "Jobs & Careers", "Events & Nightlife", "Deals & Promotions",
  "Marketplace / Buy & Sell", "Services", "Travel & Tourism",
  "Home & Garden", "Health & Wellness", "Fashion & Beauty",
  "Sports & Fitness", "Arts & Culture", "Tech & Gadgets",
];

const subscribeSchema = z.object({
  email: z.string().trim().email().max(255).toLowerCase(),
  display_name: z.string().trim().max(120).optional().nullable(),
  category: z.enum([
    "individual","business","dealership","realtor","service_provider",
    "employer","influencer","podcaster","event_organizer",
  ]),
  province: z.string().trim().max(60).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  interests: z.array(z.string().trim().min(1).max(60)).max(20).default([]),
  membership_type: z.string().trim().max(30).default("free"),
  source: z.string().trim().max(60).optional().nullable(),
});

// Public subscribe (anyone)
export const subscribeToNewsletter = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => subscribeSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Upsert by email
    const { data: existing } = await supabaseAdmin
      .from("subscriber_profiles")
      .select("id, subscribed")
      .eq("email", data.email)
      .maybeSingle();

    if (existing) {
      const { error } = await supabaseAdmin
        .from("subscriber_profiles")
        .update({
          display_name: data.display_name ?? null,
          category: data.category,
          province: data.province ?? null,
          city: data.city ?? null,
          interests: data.interests,
          membership_type: data.membership_type,
          subscribed: true,
          unsubscribed_at: null,
          source: data.source ?? null,
        })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
      return { ok: true, updated: true };
    }

    const { error } = await supabaseAdmin.from("subscriber_profiles").insert({
      email: data.email,
      display_name: data.display_name ?? null,
      category: data.category,
      province: data.province ?? null,
      city: data.city ?? null,
      interests: data.interests,
      membership_type: data.membership_type,
      source: data.source ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true, updated: false };
  });

// Admin: list + segment
const listSchema = z.object({
  category: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  interest: z.string().optional().nullable(),
  membership_type: z.string().optional().nullable(),
  subscribed_only: z.boolean().default(true),
  limit: z.number().int().min(1).max(500).default(100),
  offset: z.number().int().min(0).default(0),
});

export const listSubscribers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => listSchema.parse(data ?? {}))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Verify admin
    const { data: roleRow } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) throw new Error("Admins only");

    let q = supabaseAdmin
      .from("subscriber_profiles")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false });

    if (data.subscribed_only) q = q.eq("subscribed", true);
    if (data.category) q = q.eq("category", data.category);
    if (data.province) q = q.eq("province", data.province);
    if (data.city) q = q.ilike("city", `%${data.city}%`);
    if (data.membership_type) q = q.eq("membership_type", data.membership_type);
    if (data.interest) q = q.contains("interests", [data.interest]);

    const { data: rows, count, error } = await q.range(
      data.offset,
      data.offset + data.limit - 1,
    );
    if (error) throw new Error(error.message);

    // Aggregate stats (unfiltered)
    const { count: total } = await supabaseAdmin
      .from("subscriber_profiles")
      .select("*", { count: "exact", head: true });
    const { count: active } = await supabaseAdmin
      .from("subscriber_profiles")
      .select("*", { count: "exact", head: true })
      .eq("subscribed", true);

    return {
      rows: rows ?? [],
      count: count ?? 0,
      stats: { total: total ?? 0, active: active ?? 0 },
    };
  });
