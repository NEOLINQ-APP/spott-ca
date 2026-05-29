import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Admin only");
}

const applySchema = z.object({
  display_name: z.string().min(2).max(120),
  company_name: z.string().max(200).optional().nullable(),
  email: z.string().email().max(255),
  phone: z.string().max(40).optional().nullable(),
  website: z.string().url().max(500).optional().or(z.literal("")).nullable(),
  social_handle: z.string().max(200).optional().nullable(),
  pitch: z.string().max(2000).optional().nullable(),
});

export const applyAsPromoter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => applySchema.parse(i))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const { data: existing } = await (supabaseAdmin.from("promoters") as any)
      .select("id, status").eq("user_id", userId).maybeSingle();
    if (existing) throw new Error(`You already applied (status: ${existing.status})`);
    const { data: row, error } = await (supabaseAdmin.from("promoters") as any).insert({
      user_id: userId,
      display_name: data.display_name,
      company_name: data.company_name || null,
      email: data.email,
      phone: data.phone || null,
      website: data.website || null,
      social_handle: data.social_handle || null,
      pitch: data.pitch || null,
      status: "pending",
    }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const getMyPromoter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await (supabaseAdmin.from("promoters") as any)
      .select("*").eq("user_id", context.userId).maybeSingle();
    return data ?? null;
  });

export const getMyPromoterStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: promoter } = await (supabaseAdmin.from("promoters") as any)
      .select("id").eq("user_id", context.userId).maybeSingle();
    if (!promoter) return { promoter: null, redemptions: [], totals: { count: 0, earned_cents: 0, pending_cents: 0, paid_cents: 0 } };

    const { data: reds } = await (supabaseAdmin.from("coupon_redemptions") as any)
      .select("*")
      .eq("promoter_id", promoter.id)
      .order("redeemed_at", { ascending: false })
      .limit(500);

    const rawList = reds ?? [];
    const bizIds = Array.from(new Set(rawList.map((r: any) => r.redeemed_by_business).filter(Boolean)));
    const { data: bizRows } = bizIds.length
      ? await (supabaseAdmin.from("businesses") as any).select("id, name, slug").in("id", bizIds)
      : { data: [] as any[] };
    const bizMap = new Map((bizRows ?? []).map((b: any) => [b.id, b]));
    const list = rawList.map((r: any) => ({ ...r, business: bizMap.get(r.redeemed_by_business) ?? null }));
    const earned = list.reduce((s: number, r: any) => s + (r.commission_cents || 0), 0);
    const pending = list.filter((r: any) => r.commission_status === "pending").reduce((s: number, r: any) => s + (r.commission_cents || 0), 0);
    const paid = list.filter((r: any) => r.commission_status === "paid").reduce((s: number, r: any) => s + (r.commission_cents || 0), 0);

    return {
      promoter,
      redemptions: list,
      totals: { count: list.length, earned_cents: earned, pending_cents: pending, paid_cents: paid },
    };
  });

// ---------- Admin ----------

export const listPromoters = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ status: z.enum(["pending", "approved", "suspended", "all"]).optional() }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = (supabaseAdmin.from("promoters") as any).select("*").order("created_at", { ascending: false }).limit(500);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const updatePromoter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().uuid(),
    status: z.enum(["pending", "approved", "suspended"]).optional(),
    commission_type: z.enum(["flat", "percent"]).optional(),
    commission_value: z.number().int().min(0).max(100000).optional(),
    payout_method: z.string().max(40).optional().nullable(),
    payout_details: z.string().max(500).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { id, status, ...rest } = data;
    const patch: any = { ...rest };
    if (status) {
      patch.status = status;
      if (status === "approved") {
        patch.approved_at = new Date().toISOString();
        patch.approved_by = context.userId;
      }
    }
    const { error } = await (supabaseAdmin.from("promoters") as any).update(patch).eq("id", id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const listAllRedemptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    promoter_id: z.string().uuid().optional(),
    status: z.enum(["pending", "paid", "void", "all"]).optional(),
  }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    let q = (supabaseAdmin.from("coupon_redemptions") as any)
      .select("*")
      .order("redeemed_at", { ascending: false })
      .limit(1000);
    if (data.promoter_id) q = q.eq("promoter_id", data.promoter_id);
    if (data.status && data.status !== "all") q = q.eq("commission_status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    const bizIds = Array.from(new Set(list.map((r: any) => r.redeemed_by_business).filter(Boolean)));
    const promIds = Array.from(new Set(list.map((r: any) => r.promoter_id).filter(Boolean)));
    const [bizRes, promRes] = await Promise.all([
      bizIds.length ? (supabaseAdmin.from("businesses") as any).select("id, name, slug").in("id", bizIds) : Promise.resolve({ data: [] }),
      promIds.length ? (supabaseAdmin.from("promoters") as any).select("id, display_name, company_name").in("id", promIds) : Promise.resolve({ data: [] }),
    ]);
    const bizMap = new Map((bizRes.data ?? []).map((b: any) => [b.id, b]));
    const promMap = new Map((promRes.data ?? []).map((p: any) => [p.id, p]));
    return list.map((r: any) => ({
      ...r,
      business: bizMap.get(r.redeemed_by_business) ?? null,
      promoter: promMap.get(r.promoter_id) ?? null,
    }));
  });

export const markRedemptionsPaid = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    ids: z.array(z.string().uuid()).min(1).max(500),
    payout_ref: z.string().max(200).optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await (supabaseAdmin.from("coupon_redemptions") as any)
      .update({
        commission_status: "paid",
        commission_paid_at: new Date().toISOString(),
        commission_payout_ref: data.payout_ref ?? null,
      })
      .in("id", data.ids)
      .eq("commission_status", "pending");
    if (error) throw new Error(error.message);
    return { ok: true, count: data.ids.length };
  });
