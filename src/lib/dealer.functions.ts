// Dealer dashboard / package server functions.
// Provides overview, plan listing, founding-dealer trial enrollment,
// inventory + lead listing, and analytics aggregates.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ---------- helpers ----------
async function dealerBusinessesForOwner(
  supabase: any,
  userId: string,
): Promise<Array<{ id: string; name: string; slug: string }>> {
  const { data, error } = await supabase
    .from("businesses")
    .select("id,name,slug,owner_id")
    .eq("owner_id", userId);
  if (error) throw new Error(error.message);
  return (data ?? []).map((b: any) => ({ id: b.id, name: b.name, slug: b.slug }));
}

// ---------- list plans (public) ----------
export const listDealerPlans = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("subscription_plans")
    .select(
      "id,tier,slug,name,description,monthly_price_cents,yearly_price_cents,currency,inventory_limit,featured_slots,boost_credits_monthly,lead_management,analytics_access,priority_support,custom_branding,api_access,multi_location_support,inventory_feed_imports,video_uploads,photo_quota_per_vehicle,featured_placement,trial_days,founding_member_discount_pct,sort_order",
    )
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return { plans: data ?? [] };
});

// ---------- overview ----------
export const getDealerOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const businesses = await dealerBusinessesForOwner(supabase, userId);
    const businessIds = businesses.map((b) => b.id);

    let subscriptions: any[] = [];
    if (businessIds.length) {
      const { data } = await supabase
        .from("dealer_subscriptions")
        .select("*, plan:subscription_plans(*)")
        .in("business_id", businessIds)
        .order("created_at", { ascending: false });
      subscriptions = data ?? [];
    }

    let vehicleCount = 0;
    let activeCount = 0;
    let featuredCount = 0;
    if (businessIds.length) {
      const { count: total } = await supabase
        .from("vehicles")
        .select("id", { count: "exact", head: true })
        .in("dealer_business_id", businessIds);
      vehicleCount = total ?? 0;
      const { count: active } = await supabase
        .from("vehicles")
        .select("id", { count: "exact", head: true })
        .in("dealer_business_id", businessIds)
        .eq("status", "active");
      activeCount = active ?? 0;
      const { count: feat } = await supabase
        .from("vehicles")
        .select("id", { count: "exact", head: true })
        .in("dealer_business_id", businessIds)
        .eq("is_featured", true);
      featuredCount = feat ?? 0;
    }

    let leadCount = 0;
    let newLeadCount = 0;
    if (businessIds.length) {
      const { data: vIds } = await supabase
        .from("vehicles")
        .select("id")
        .in("dealer_business_id", businessIds);
      const ids = (vIds ?? []).map((v: any) => v.id);
      if (ids.length) {
        const { count: lc } = await supabase
          .from("vehicle_leads")
          .select("id", { count: "exact", head: true })
          .in("vehicle_id", ids);
        leadCount = lc ?? 0;
        const { count: nl } = await supabase
          .from("vehicle_leads")
          .select("id", { count: "exact", head: true })
          .in("vehicle_id", ids)
          .eq("status", "new");
        newLeadCount = nl ?? 0;
      }
    }

    return {
      businesses,
      subscriptions,
      stats: { vehicleCount, activeCount, featuredCount, leadCount, newLeadCount },
    };
  });

// ---------- list vehicles ----------
export const listDealerVehicles = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const businesses = await dealerBusinessesForOwner(supabase, userId);
    const ids = businesses.map((b) => b.id);
    if (!ids.length) return { vehicles: [] };
    const { data, error } = await supabase
      .from("vehicles")
      .select(
        "id,title,year,make,model,price_cents,status,city,province,mileage_km,is_featured,is_boosted,view_count,created_at,dealer_business_id",
      )
      .in("dealer_business_id", ids)
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return { vehicles: data ?? [] };
  });

// ---------- list leads ----------
export const listDealerLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const businesses = await dealerBusinessesForOwner(supabase, userId);
    const ids = businesses.map((b) => b.id);
    if (!ids.length) return { leads: [] };
    const { data: vIds } = await supabase
      .from("vehicles")
      .select("id,title,year,make,model")
      .in("dealer_business_id", ids);
    const vMap = new Map<string, any>((vIds ?? []).map((v: any) => [v.id, v]));
    const vehicleIds = Array.from(vMap.keys());
    if (!vehicleIds.length) return { leads: [] };
    const { data, error } = await supabase
      .from("vehicle_leads")
      .select(
        "id,lead_type,status,vehicle_id,full_name,email,phone,city,province,preferred_date,preferred_time,message,created_at",
      )
      .in("vehicle_id", vehicleIds)
      .order("created_at", { ascending: false })
      .limit(300);
    if (error) throw new Error(error.message);
    const leads = (data ?? []).map((l: any) => ({
      ...l,
      vehicle: vMap.get(l.vehicle_id) ?? null,
    }));
    return { leads };
  });

// ---------- analytics ----------
export const getDealerAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context as any;
    const businesses = await dealerBusinessesForOwner(supabase, userId);
    const ids = businesses.map((b) => b.id);
    if (!ids.length) return { views: 0, leads: 0, vehicles: 0, ctr: 0, topVehicles: [] };

    const { data: vehicles } = await supabase
      .from("vehicles")
      .select("id,title,year,make,model,view_count")
      .in("dealer_business_id", ids);
    const list = vehicles ?? [];
    const totalViews = list.reduce((s: number, v: any) => s + (v.view_count ?? 0), 0);
    const topVehicles = [...list]
      .sort((a: any, b: any) => (b.view_count ?? 0) - (a.view_count ?? 0))
      .slice(0, 10);

    const vehicleIds = list.map((v: any) => v.id);
    let totalLeads = 0;
    if (vehicleIds.length) {
      const { count } = await supabase
        .from("vehicle_leads")
        .select("id", { count: "exact", head: true })
        .in("vehicle_id", vehicleIds);
      totalLeads = count ?? 0;
    }
    const ctr = totalViews > 0 ? totalLeads / totalViews : 0;

    return {
      views: totalViews,
      leads: totalLeads,
      vehicles: list.length,
      ctr,
      topVehicles,
    };
  });

// ---------- start trial / select plan ----------
const StartTrialInput = z.object({
  business_id: z.string().uuid(),
  plan_id: z.string().uuid(),
  billing_interval: z.enum(["monthly", "yearly"]).default("monthly"),
  is_founding_dealer: z.boolean().default(true),
});

export const startDealerTrial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => StartTrialInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    // verify ownership
    const { data: biz, error: bErr } = await supabase
      .from("businesses")
      .select("id,owner_id")
      .eq("id", data.business_id)
      .maybeSingle();
    if (bErr) throw new Error(bErr.message);
    if (!biz || biz.owner_id !== userId) throw new Error("Not authorized for this business.");

    const { data: plan, error: pErr } = await supabase
      .from("subscription_plans")
      .select(
        "id,monthly_price_cents,yearly_price_cents,trial_days,founding_member_discount_pct",
      )
      .eq("id", data.plan_id)
      .maybeSingle();
    if (pErr) throw new Error(pErr.message);
    if (!plan) throw new Error("Plan not found.");

    const trialDays = plan.trial_days ?? 90;
    const now = new Date();
    const trialEnd = new Date(now.getTime() + trialDays * 86400 * 1000);

    const discount = data.is_founding_dealer
      ? Math.min(100, Math.max(0, plan.founding_member_discount_pct ?? 0))
      : 0;
    const lockedMonthly = Math.round((plan.monthly_price_cents ?? 0) * (1 - discount / 100));
    const lockedYearly = Math.round((plan.yearly_price_cents ?? 0) * (1 - discount / 100));

    // upsert subscription row
    const { data: existing } = await supabase
      .from("dealer_subscriptions")
      .select("id")
      .eq("business_id", data.business_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const payload: Record<string, unknown> = {
      business_id: data.business_id,
      plan_id: data.plan_id,
      billing_interval: data.billing_interval,
      status: "trialing",
      trial_ends_at: trialEnd.toISOString(),
      current_period_start: now.toISOString(),
      current_period_end: trialEnd.toISOString(),
      cancel_at_period_end: false,
      is_founding_dealer: data.is_founding_dealer,
      locked_monthly_price_cents: lockedMonthly,
      locked_yearly_price_cents: lockedYearly,
      auto_renew: true,
    };

    if (existing?.id) {
      const { error: uErr } = await supabase
        .from("dealer_subscriptions")
        .update(payload)
        .eq("id", existing.id);
      if (uErr) throw new Error(uErr.message);
      return { id: existing.id, trial_ends_at: trialEnd.toISOString() };
    }
    const { data: inserted, error: iErr } = await supabase
      .from("dealer_subscriptions")
      .insert(payload)
      .select("id,trial_ends_at")
      .single();
    if (iErr) throw new Error(iErr.message);
    return inserted;
  });

// ---------- update lead status ----------
const UpdateLeadInput = z.object({
  lead_id: z.string().uuid(),
  status: z.enum(["new", "contacted", "qualified", "converted", "closed", "archived"]),
});

export const updateDealerLeadStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpdateLeadInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as any;
    // verify lead's vehicle is owned by user via dealer_business_id
    const { data: lead } = await supabase
      .from("vehicle_leads")
      .select("id,vehicle_id")
      .eq("id", data.lead_id)
      .maybeSingle();
    if (!lead?.vehicle_id) throw new Error("Lead not found.");
    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("id,dealer_business_id")
      .eq("id", lead.vehicle_id)
      .maybeSingle();
    if (!vehicle?.dealer_business_id) throw new Error("Not authorized.");
    const { data: biz } = await supabase
      .from("businesses")
      .select("owner_id")
      .eq("id", vehicle.dealer_business_id)
      .maybeSingle();
    if (!biz || biz.owner_id !== userId) throw new Error("Not authorized.");

    const { error } = await supabase
      .from("vehicle_leads")
      .update({ status: data.status })
      .eq("id", data.lead_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
