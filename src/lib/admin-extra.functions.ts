import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Admin only");
}

export const getPlatformMetrics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const [
      gmvRes,
      adRevRes,
      activePromotersRes,
      pendingPromotersRes,
      activeBusinessesRes,
      verifReqsRes,
      pendingDisputesRes,
      ordersTodayRes,
      paidOrdersRes,
      topCatsRes,
      activeListingsRes,
    ] = await Promise.all([
      supabaseAdmin
        .from("marketplace_orders")
        .select("total_cents")
        .in("status", ["paid", "fulfilled", "disputed"]),
      supabaseAdmin.from("addon_purchases").select("amount_cents").eq("status", "completed"),
      supabaseAdmin.from("promoters").select("id", { count: "exact", head: true }).eq("status", "approved"),
      supabaseAdmin.from("promoters").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabaseAdmin.from("businesses").select("id", { count: "exact", head: true }).eq("status", "approved"),
      supabaseAdmin.from("business_verification_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabaseAdmin.from("marketplace_disputes").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabaseAdmin
        .from("marketplace_orders")
        .select("id", { count: "exact", head: true })
        .gte("created_at", new Date(Date.now() - 86_400_000).toISOString()),
      supabaseAdmin
        .from("marketplace_orders")
        .select("id", { count: "exact", head: true })
        .in("status", ["paid", "fulfilled"]),
      supabaseAdmin.from("marketplace_listings").select("category_id").eq("status", "active").limit(2000),
      supabaseAdmin.from("marketplace_listings").select("id", { count: "exact", head: true }).eq("status", "active"),
    ]);

    const gmvCents = (gmvRes.data ?? []).reduce((s: number, r: any) => s + (r.total_cents ?? 0), 0);
    const adRevenueCents = (adRevRes.data ?? []).reduce((s: number, r: any) => s + (r.amount_cents ?? 0), 0);

    // Top categories
    const counts: Record<string, number> = {};
    for (const row of topCatsRes.data ?? []) {
      const cid = (row as any).category_id;
      if (!cid) continue;
      counts[cid] = (counts[cid] ?? 0) + 1;
    }
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5);
    let topCategories: { name: string; count: number }[] = [];
    if (top.length) {
      const { data: cats } = await supabaseAdmin
        .from("marketplace_categories")
        .select("id, name")
        .in("id", top.map(([id]) => id));
      const byId: Record<string, string> = Object.fromEntries((cats ?? []).map((c) => [c.id, c.name]));
      topCategories = top.map(([id, count]) => ({ name: byId[id] ?? "Other", count }));
    }

    // Fraud signals: pending claims unanswered > 7d, disputes open > 3d, listings flagged
    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const threeDaysAgo = new Date(Date.now() - 3 * 86_400_000).toISOString();
    const [staleClaims, staleDisputes, suspiciousListings] = await Promise.all([
      supabaseAdmin
        .from("business_claims")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending")
        .lt("created_at", sevenDaysAgo),
      supabaseAdmin
        .from("marketplace_disputes")
        .select("id", { count: "exact", head: true })
        .eq("status", "open")
        .lt("created_at", threeDaysAgo),
      supabaseAdmin
        .from("marketplace_listings")
        .select("id", { count: "exact", head: true })
        .gte("price_cents", 1_000_000), // $10k+ listings flagged for review
    ]);

    return {
      gmvCents,
      adRevenueCents,
      promoters: {
        active: activePromotersRes.count ?? 0,
        pending: pendingPromotersRes.count ?? 0,
      },
      activeBusinesses: activeBusinessesRes.count ?? 0,
      activeListings: activeListingsRes.count ?? 0,
      pendingVerifications: verifReqsRes.count ?? 0,
      pendingDisputes: pendingDisputesRes.count ?? 0,
      ordersToday: ordersTodayRes.count ?? 0,
      paidOrdersTotal: paidOrdersRes.count ?? 0,
      topCategories,
      fraudAlerts: {
        staleClaims: staleClaims.count ?? 0,
        staleDisputes: staleDisputes.count ?? 0,
        highValueListings: suspiciousListings.count ?? 0,
      },
    };
  });

export const listAllOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      status: z.enum(["all", "pending", "paid", "fulfilled", "disputed", "refunded"]).default("all"),
      limit: z.number().min(1).max(500).default(100),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin
      .from("marketplace_orders")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: orders } = await q;
    return { orders: orders ?? [] };
  });

export const listAllDisputes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data } = await supabaseAdmin
      .from("marketplace_disputes")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    return { disputes: data ?? [] };
  });

export const resolveDispute = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      id: z.string().uuid(),
      resolution: z.string().min(3).max(500),
      status: z.enum(["resolved", "rejected"]),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("marketplace_disputes")
      .update({ status: data.status, resolution: data.resolution, resolved_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listVerificationRequests = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      status: z.enum(["pending", "approved", "rejected", "all"]).default("pending"),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin
      .from("business_verification_requests")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows } = await q;
    return { rows: rows ?? [] };
  });

export const reviewVerification = createServerFn({ method: "POST" })
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
    const { error } = await supabaseAdmin
      .from("business_verification_requests")
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

export const listMarketplaceListingsForAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      status: z.enum(["active", "sold", "removed", "all"]).default("active"),
      search: z.string().trim().max(120).optional(),
      limit: z.number().min(1).max(500).default(100),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin
      .from("marketplace_listings")
      .select("id, user_id, title, price_cents, currency, status, city, province, created_at, view_count")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.status !== "all") q = q.eq("status", data.status);
    if (data.search) {
      const s = data.search.replace(/[%_]/g, "\\$&");
      q = q.ilike("title", `%${s}%`);
    }
    const { data: rows } = await q;
    return { rows: rows ?? [] };
  });

export const moderateMarketplaceListing = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: z.string().uuid(), action: z.enum(["remove", "restore", "delete"]) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.action === "delete") {
      const { error } = await supabaseAdmin.from("marketplace_listings").delete().eq("id", data.id);
      if (error) throw new Error(error.message);
    } else {
      const status = data.action === "remove" ? "removed" : "active";
      const { error } = await supabaseAdmin.from("marketplace_listings").update({ status }).eq("id", data.id);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const listUsersAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      search: z.string().trim().max(120).optional(),
      limit: z.number().min(1).max(200).default(50),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin
      .from("profiles")
      .select("id, display_name, avatar_url, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.search) {
      const s = data.search.replace(/[%_]/g, "\\$&");
      q = q.ilike("display_name", `%${s}%`);
    }
    const { data: profiles } = await q;
    const ids = (profiles ?? []).map((p) => p.id);
    let roles: Record<string, string[]> = {};
    if (ids.length) {
      const { data: rr } = await supabaseAdmin.from("user_roles").select("user_id, role").in("user_id", ids);
      for (const r of rr ?? []) {
        (roles[r.user_id] ||= []).push(r.role);
      }
    }
    return {
      users: (profiles ?? []).map((p) => ({ ...p, roles: roles[p.id] ?? [] })),
    };
  });
