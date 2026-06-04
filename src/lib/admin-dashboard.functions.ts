import { createServerFn } from "@tanstack/react-start";
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

function startDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(0, 0, 0, 0);
  return d;
}

function bucketByDay(rows: Array<{ created_at: string; total_cents?: number | null }>, days: number) {
  const buckets: Record<string, { date: string; revenue: number; orders: number }> = {};
  for (let i = days - 1; i >= 0; i--) {
    const d = startDaysAgo(i);
    const key = d.toISOString().slice(0, 10);
    buckets[key] = { date: key, revenue: 0, orders: 0 };
  }
  for (const r of rows) {
    const key = r.created_at.slice(0, 10);
    if (!buckets[key]) continue;
    buckets[key].orders += 1;
    buckets[key].revenue += (r.total_cents ?? 0) / 100;
  }
  return Object.values(buckets);
}

export const getAdminDashboard = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const since30 = startDaysAgo(30).toISOString();

    const [
      revenueAgg,
      ordersCount,
      activeUsers,
      activeBiz,
      promotersTotal,
      pendingPayouts,
      ordersSeries,
      recentOrders,
      recentSignups,
      topPromoters,
    ] = await Promise.all([
      supabaseAdmin
        .from("marketplace_orders")
        .select("total_cents")
        .in("status", ["paid", "fulfilled", "completed", "released"]),
      supabaseAdmin.from("marketplace_orders").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("businesses")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved"),
      supabaseAdmin
        .from("promoters")
        .select("id", { count: "exact", head: true })
        .eq("status", "approved"),
      supabaseAdmin
        .from("marketplace_seller_payouts")
        .select("id", { count: "exact", head: true })
        .eq("status", "pending"),
      supabaseAdmin
        .from("marketplace_orders")
        .select("created_at,total_cents")
        .gte("created_at", since30)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("marketplace_orders")
        .select("id,total_cents,status,created_at,buyer_id,promoter_code")
        .order("created_at", { ascending: false })
        .limit(8),
      supabaseAdmin
        .from("profiles")
        .select("id,display_name,created_at")
        .order("created_at", { ascending: false })
        .limit(8),
      supabaseAdmin
        .from("promoters")
        .select("id,display_name,email,status,created_at")
        .eq("status", "approved")
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    const totalRevenue =
      (revenueAgg.data ?? []).reduce((s, r: any) => s + (r.total_cents ?? 0), 0) / 100;

    // Per-promoter order counts (top 5)
    const promoterOrders = await supabaseAdmin
      .from("marketplace_orders")
      .select("promoter_id,total_cents")
      .not("promoter_id", "is", null);

    const promoStats: Record<string, { orders: number; revenue: number }> = {};
    for (const r of (promoterOrders.data ?? []) as any[]) {
      const k = r.promoter_id as string;
      if (!promoStats[k]) promoStats[k] = { orders: 0, revenue: 0 };
      promoStats[k].orders += 1;
      promoStats[k].revenue += (r.total_cents ?? 0) / 100;
    }
    const topIds = Object.entries(promoStats)
      .sort((a, b) => b[1].revenue - a[1].revenue)
      .slice(0, 5)
      .map(([id]) => id);
    let topPromoterRows: Array<{
      id: string;
      name: string;
      orders: number;
      revenue: number;
    }> = [];
    if (topIds.length) {
      const { data: p } = await supabaseAdmin
        .from("promoters")
        .select("id,display_name")
        .in("id", topIds);
      topPromoterRows = topIds.map((id) => ({
        id,
        name: (p ?? []).find((x: any) => x.id === id)?.display_name ?? "—",
        orders: promoStats[id].orders,
        revenue: promoStats[id].revenue,
      }));
    } else {
      topPromoterRows = (topPromoters.data ?? []).map((p: any) => ({
        id: p.id,
        name: p.display_name,
        orders: 0,
        revenue: 0,
      }));
    }

    return {
      kpis: {
        totalRevenue,
        totalOrders: ordersCount.count ?? 0,
        activeUsers: activeUsers.count ?? 0,
        activeBusinesses: activeBiz.count ?? 0,
        totalPromoters: promotersTotal.count ?? 0,
        promoCodeUsage: (promoterOrders.data ?? []).length,
        pendingPayouts: pendingPayouts.count ?? 0,
      },
      series: bucketByDay((ordersSeries.data ?? []) as any, 30),
      recentOrders: (recentOrders.data ?? []) as any[],
      recentSignups: (recentSignups.data ?? []) as any[],
      topPromoters: topPromoterRows,
    };
  });
