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

function startOf(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

// Overview stats for /admin home tab
export const getAdminOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const today = startOf(0);
    const d7 = startOf(7);
    const d30 = startOf(30);

    // Counts in parallel
    const [
      pendingBiz,
      approvedBiz,
      totalBiz,
      pendingClaims,
      totalReviews,
      activeSubs,
      newUsersToday,
      newUsers7,
      newUsers30,
      totalUsers,
    ] = await Promise.all([
      supabaseAdmin.from("businesses").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabaseAdmin.from("businesses").select("id", { count: "exact", head: true }).eq("status", "approved"),
      supabaseAdmin.from("businesses").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("business_claims").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabaseAdmin.from("reviews").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("subscriptions")
        .select("id", { count: "exact", head: true })
        .in("status", ["active", "trialing"]),
      supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1 }), // dummy for total
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", d7),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", d30),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
    ]);

    const todayUsers = await supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", today);

    return {
      businesses: {
        pending: pendingBiz.count ?? 0,
        approved: approvedBiz.count ?? 0,
        total: totalBiz.count ?? 0,
      },
      pendingClaims: pendingClaims.count ?? 0,
      totalReviews: totalReviews.count ?? 0,
      activeSubscriptions: activeSubs.count ?? 0,
      users: {
        today: todayUsers.count ?? 0,
        last7: newUsers7.count ?? 0,
        last30: newUsers30.count ?? 0,
        total: totalUsers.count ?? 0,
      },
    };
  });

// List pending businesses for moderation queue
export const listPendingBusinesses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ status: z.enum(["pending", "approved", "rejected"]).default("pending"), limit: z.number().min(1).max(200).default(50) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: rows } = await supabaseAdmin
      .from("businesses")
      .select(
        "id, name, slug, city, province, address, phone, website, email, description, category_id, status, is_claimed, owner_id, created_at, hero_image_url",
      )
      .eq("status", data.status)
      .order("created_at", { ascending: false })
      .limit(data.limit);

    const catIds = Array.from(new Set((rows ?? []).map((r) => r.category_id).filter(Boolean))) as string[];
    let cats: Record<string, string> = {};
    if (catIds.length) {
      const { data: catRows } = await supabaseAdmin.from("categories").select("id, name").in("id", catIds);
      cats = Object.fromEntries((catRows ?? []).map((c) => [c.id, c.name]));
    }

    return {
      rows: (rows ?? []).map((r) => ({ ...r, category_name: r.category_id ? cats[r.category_id] ?? null : null })),
    };
  });

// Approve or reject a listing
export const moderateBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: z.string().uuid(), action: z.enum(["approve", "reject"]) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const status = data.action === "approve" ? "approved" : "rejected";
    const { error } = await supabaseAdmin.from("businesses").update({ status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
