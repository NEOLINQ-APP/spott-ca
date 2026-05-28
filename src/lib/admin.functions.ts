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

// List businesses for moderation queue (with search + "all" support)
export const listPendingBusinesses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        status: z.enum(["pending", "approved", "rejected", "all"]).default("pending"),
        limit: z.number().min(1).max(500).default(50),
        search: z.string().trim().max(120).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin
      .from("businesses")
      .select(
        "id, name, slug, city, province, address, phone, website, email, description, category_id, status, is_claimed, owner_id, created_at, hero_image_url",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);

    if (data.status !== "all") q = q.eq("status", data.status);
    if (data.search) {
      const s = data.search.replace(/[%_]/g, "\\$&");
      q = q.or(`name.ilike.%${s}%,slug.ilike.%${s}%,city.ilike.%${s}%,email.ilike.%${s}%`);
    }

    const { data: rows } = await q;

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

// Approve / reject / suspend a listing. "suspend" sets an approved listing back to rejected.
export const moderateBusiness = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: z.string().uuid(), action: z.enum(["approve", "reject", "suspend"]) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const status = data.action === "approve" ? "approved" : "rejected";
    const { error } = await supabaseAdmin.from("businesses").update({ status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

// Hard-delete a listing (admin only).
export const deleteBusinessAsAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    // Best-effort cleanup of dependent rows that may lack ON DELETE CASCADE.
    await supabaseAdmin.from("business_features").delete().eq("business_id", data.id);
    await supabaseAdmin.from("business_photos").delete().eq("business_id", data.id);
    await supabaseAdmin.from("specials").delete().eq("business_id", data.id);
    await supabaseAdmin.from("business_follows").delete().eq("business_id", data.id);
    await supabaseAdmin.from("business_views").delete().eq("business_id", data.id);
    await supabaseAdmin.from("booking_clicks").delete().eq("business_id", data.id);
    await supabaseAdmin.from("listing_card_clicks").delete().eq("business_id", data.id);
    await supabaseAdmin.from("reviews").delete().eq("business_id", data.id);
    await supabaseAdmin.from("business_claims").delete().eq("business_id", data.id);

    const { error } = await supabaseAdmin.from("businesses").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });


// Load the full editable record for one business (admin).
export const getBusinessForAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: biz, error } = await supabaseAdmin
      .from("businesses")
      .select(
        "id, name, slug, category_id, address, city, province, postal_code, phone, email, website, hero_image_url",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!biz) throw new Error("Not found");

    const { data: photos } = await supabaseAdmin
      .from("business_photos")
      .select("id, storage_path, sort_order")
      .eq("business_id", data.id)
      .order("sort_order", { ascending: true });

    return { business: biz, photos: photos ?? [] };
  });

// Find other businesses that look like the same chain (same name + same category).
export const findChainPeers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: src } = await supabaseAdmin
      .from("businesses")
      .select("id, name, category_id")
      .eq("id", data.id)
      .maybeSingle();
    if (!src) throw new Error("Not found");

    let q = supabaseAdmin
      .from("businesses")
      .select("id, name, city, province, hero_image_url")
      .ilike("name", src.name)
      .neq("id", src.id);
    if (src.category_id) q = q.eq("category_id", src.category_id);
    else q = q.is("category_id", null);

    const { data: peers, error } = await q.limit(500);
    if (error) throw new Error(error.message);
    return { peers: peers ?? [] };
  });

// Copy the source business's hero_image_url onto every chain peer.
export const applyHeroToChain = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: z.string().uuid(), overwriteExisting: z.boolean().default(false) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: src } = await supabaseAdmin
      .from("businesses")
      .select("id, name, category_id, hero_image_url")
      .eq("id", data.id)
      .maybeSingle();
    if (!src) throw new Error("Not found");
    if (!src.hero_image_url) throw new Error("This business has no cover image yet — upload one first.");

    let q = supabaseAdmin
      .from("businesses")
      .select("id, hero_image_url")
      .ilike("name", src.name)
      .neq("id", src.id);
    if (src.category_id) q = q.eq("category_id", src.category_id);
    else q = q.is("category_id", null);

    const { data: peers } = await q.limit(1000);
    const targets = (peers ?? []).filter((p) =>
      data.overwriteExisting ? true : !p.hero_image_url || /unsplash|clearbit/i.test(p.hero_image_url ?? ""),
    );
    if (targets.length === 0) return { updated: 0, total: peers?.length ?? 0 };

    const ids = targets.map((t) => t.id);
    const { error } = await supabaseAdmin
      .from("businesses")
      .update({ hero_image_url: src.hero_image_url })
      .in("id", ids);
    if (error) throw new Error(error.message);
    return { updated: ids.length, total: peers?.length ?? 0 };
  });
