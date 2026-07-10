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

export const getComplianceOverview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);

    const sevenDaysAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const [
      pendingClaims,
      staleClaims,
      pendingVerifications,
      openDisputes,
      hiddenReviews,
      reportedReviews,
      unverifiedDealerListings,
      unsignedDealerListings,
      disclosureAudits7d,
      pendingPromoters,
      pendingPayouts,
    ] = await Promise.all([
      supabaseAdmin.from("business_claims").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabaseAdmin.from("business_claims").select("id", { count: "exact", head: true }).eq("status", "pending").lt("created_at", sevenDaysAgo),
      supabaseAdmin.from("business_verification_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabaseAdmin.from("marketplace_disputes").select("id", { count: "exact", head: true }).eq("status", "open"),
      supabaseAdmin.from("reviews").select("id", { count: "exact", head: true }).eq("is_hidden", true),
      supabaseAdmin.from("review_reports").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabaseAdmin.from("vehicles").select("id", { count: "exact", head: true }).eq("seller_type", "dealer").in("status", ["active", "featured"]).is("dealer_business_id", null),
      supabaseAdmin.from("vehicles").select("id", { count: "exact", head: true }).eq("seller_type", "dealer").in("status", ["active", "featured"]).is("disclosure_signed_at", null),
      supabaseAdmin.from("vehicle_disclosure_audit").select("id", { count: "exact", head: true }).gte("signed_at", sevenDaysAgo),
      supabaseAdmin.from("promoters").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabaseAdmin.from("promoter_payout_requests").select("id", { count: "exact", head: true }).eq("status", "pending"),
    ]);

    return {
      pendingClaims: pendingClaims.count ?? 0,
      staleClaims: staleClaims.count ?? 0,
      pendingVerifications: pendingVerifications.count ?? 0,
      openDisputes: openDisputes.count ?? 0,
      hiddenReviews: hiddenReviews.count ?? 0,
      reportedReviews: reportedReviews.count ?? 0,
      unverifiedDealerListings: unverifiedDealerListings.count ?? 0,
      unsignedDealerListings: unsignedDealerListings.count ?? 0,
      disclosureAudits7d: disclosureAudits7d.count ?? 0,
      pendingPromoters: pendingPromoters.count ?? 0,
      pendingPayouts: pendingPayouts.count ?? 0,
    };
  });

export const listAdminAuditLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      target_type: z.string().max(60).optional(),
      limit: z.number().min(1).max(500).default(100),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = supabaseAdmin
      .from("admin_audit_log")
      .select("id, actor_id, action, target_type, target_id, reason, before, after, created_at")
      .order("created_at", { ascending: false })
      .limit(data.limit);
    if (data.target_type) q = q.eq("target_type", data.target_type);
    const { data: rows } = await q;

    const actorIds = Array.from(new Set((rows ?? []).map((r) => r.actor_id).filter(Boolean)));
    let actors: Record<string, string> = {};
    if (actorIds.length) {
      const { data: profs } = await supabaseAdmin
        .from("profiles").select("id, display_name").in("id", actorIds);
      actors = Object.fromEntries((profs ?? []).map((p) => [p.id, p.display_name ?? "—"]));
    }
    return { rows: (rows ?? []).map((r) => ({ ...r, actor_name: actors[r.actor_id] ?? r.actor_id?.slice(0, 8) ?? "system" })) };
  });

export const listDisclosureAudits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ limit: z.number().min(1).max(500).default(100) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: rows } = await supabaseAdmin
      .from("vehicle_disclosure_audit")
      .select("id, vehicle_id, user_id, attestation, signed_at")
      .order("signed_at", { ascending: false })
      .limit(data.limit);
    return { rows: rows ?? [] };
  });
