import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const ADDON_TYPES = [
  "spott_extra_tags",
  "spott_bump_up_once",
  "spott_feature_7d_once",
  "spott_photo_pack_once",
  "spott_pro_month",
  "spott_business_month",
] as const;
type AddonType = typeof ADDON_TYPES[number];

const DISCOUNT_KINDS = ["addon_grant", "percent_off", "amount_off"] as const;

async function assertAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Admin only");
}

function genCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

export const createCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    addon_type: z.string().min(1).max(64),
    notes: z.string().max(500).optional(),
    expires_in_days: z.number().int().min(1).max(3650).optional(),
    code: z.string().min(4).max(32).regex(/^[A-Z0-9_-]+$/i).optional(),
    max_uses: z.number().int().min(1).max(100000).nullable().optional(),
    discount_kind: z.enum(DISCOUNT_KINDS).optional(),
    discount_value: z.number().int().min(1).max(100000).optional(),
    promoter_id: z.string().uuid().nullable().optional(),
    is_universal: z.boolean().optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    if (data.is_universal) {
      if (data.discount_kind !== "percent_off") throw new Error("Universal coupons must use Percent off");
      if (!data.discount_value || data.discount_value < 1 || data.discount_value > 100) {
        throw new Error("Universal percent must be between 1 and 100");
      }
    } else if (!ADDON_TYPES.includes(data.addon_type as AddonType)) {
      throw new Error("Invalid addon type");
    }
    const code = (data.code || genCode()).toUpperCase();
    const expires_at = data.expires_in_days
      ? new Date(Date.now() + data.expires_in_days * 86400_000).toISOString()
      : null;
    const { data: row, error } = await (supabaseAdmin.from("admin_coupons") as any).insert({
      code,
      addon_type: data.is_universal ? "universal_percent" : data.addon_type,
      notes: data.notes ?? null,
      expires_at,
      created_by: context.userId,
      max_uses: data.max_uses ?? 1,
      discount_kind: data.discount_kind ?? "addon_grant",
      discount_value: data.discount_value ?? null,
      promoter_id: data.promoter_id ?? null,
      is_universal: !!data.is_universal,
    }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

// Public preview: validates a universal code and returns its percent without redeeming.
export const previewUniversalCoupon = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ code: z.string().min(4).max(32) }).parse(i))
  .handler(async ({ data }) => {
    const code = data.code.toUpperCase().trim();
    const { data: c } = await (supabaseAdmin.from("admin_coupons") as any)
      .select("id, code, is_universal, status, expires_at, max_uses, uses_count, discount_kind, discount_value")
      .eq("code", code).maybeSingle();
    if (!c || !c.is_universal) return { valid: false as const, reason: "Code not found" };
    if (c.status !== "active") return { valid: false as const, reason: "Code is no longer active" };
    if (c.expires_at && new Date(c.expires_at) < new Date()) return { valid: false as const, reason: "Code has expired" };
    if (c.max_uses != null && (c.uses_count ?? 0) >= c.max_uses) return { valid: false as const, reason: "Code usage limit reached" };
    if (c.discount_kind !== "percent_off" || !c.discount_value) return { valid: false as const, reason: "Invalid discount" };
    return { valid: true as const, code: c.code as string, percent_off: c.discount_value as number };
  });

export const listCoupons = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await (supabaseAdmin.from("admin_coupons") as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);
    if (error) throw new Error(error.message);
    const list = data ?? [];
    const promIds = Array.from(new Set(list.map((c: any) => c.promoter_id).filter(Boolean)));
    const { data: proms } = promIds.length
      ? await (supabaseAdmin.from("promoters") as any).select("id, display_name, company_name").in("id", promIds)
      : { data: [] as any[] };
    const promMap = new Map((proms ?? []).map((p: any) => [p.id, p]));
    return list.map((c: any) => ({ ...c, promoter: c.promoter_id ? promMap.get(c.promoter_id) ?? null : null }));
  });

export const revokeCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await (supabaseAdmin.from("admin_coupons") as any)
      .update({ status: "revoked" })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    await (supabaseAdmin.from("coupon_redemptions") as any).delete().eq("coupon_id", data.id);
    const { error } = await (supabaseAdmin.from("admin_coupons") as any).delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const extendCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    id: z.string().uuid(),
    extend_days: z.number().int().min(1).max(36500),
    reactivate: z.boolean().optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: cur } = await (supabaseAdmin.from("admin_coupons") as any)
      .select("expires_at, status").eq("id", data.id).maybeSingle();
    if (!cur) throw new Error("Coupon not found");
    const base = cur.expires_at && new Date(cur.expires_at) > new Date()
      ? new Date(cur.expires_at) : new Date();
    const newExpiry = new Date(base.getTime() + data.extend_days * 86400_000).toISOString();
    const patch: any = { expires_at: newExpiry };
    if (data.reactivate && cur.status !== "active") patch.status = "active";
    const { error } = await (supabaseAdmin.from("admin_coupons") as any).update(patch).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true, expires_at: newExpiry };
  });

export const listCouponRedemptions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ coupon_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { data: rows, error } = await (supabaseAdmin.from("coupon_redemptions") as any)
      .select("*")
      .eq("coupon_id", data.coupon_id)
      .order("redeemed_at", { ascending: false });
    if (error) throw new Error(error.message);
    const list = rows ?? [];
    const bizIds = Array.from(new Set(list.map((r: any) => r.redeemed_by_business).filter(Boolean)));
    const userIds = Array.from(new Set(list.map((r: any) => r.redeemed_by_user).filter(Boolean)));
    const [bizRes, userRes] = await Promise.all([
      bizIds.length ? (supabaseAdmin.from("businesses") as any).select("id, name, slug").in("id", bizIds) : Promise.resolve({ data: [] }),
      userIds.length ? (supabaseAdmin.from("profiles") as any).select("id, display_name").in("id", userIds) : Promise.resolve({ data: [] }),
    ]);
    const bizMap = new Map((bizRes.data ?? []).map((b: any) => [b.id, b]));
    const userMap = new Map((userRes.data ?? []).map((u: any) => [u.id, u]));
    return list.map((r: any) => ({
      ...r,
      business: bizMap.get(r.redeemed_by_business) ?? null,
      user: userMap.get(r.redeemed_by_user) ?? null,
    }));
  });

export const redeemCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({
    code: z.string().min(4).max(32),
    business_id: z.string().uuid(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    const userId = context.userId;
    const code = data.code.toUpperCase().trim();
    const nowIso = new Date().toISOString();

    // Ownership check
    const { data: biz } = await supabaseAdmin
      .from("businesses")
      .select("id, owner_id, name, extra_tags_until, featured_until, bumped_until, photo_pack_bonus")
      .eq("id", data.business_id)
      .maybeSingle();
    if (!biz) throw new Error("Business not found");
    if (biz.owner_id !== userId) throw new Error("You don't own this business");

    // Fetch coupon
    const { data: coupon } = await (supabaseAdmin.from("admin_coupons") as any)
      .select("*").eq("code", code).maybeSingle();
    if (!coupon) throw new Error("Invalid code");
    if (coupon.status !== "active") throw new Error("This code is no longer active");
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) throw new Error("This code has expired");
    if (coupon.max_uses != null && coupon.uses_count >= coupon.max_uses) throw new Error("This code has reached its usage limit");

    // Prevent same business redeeming twice (DB unique index also enforces)
    const { data: existing } = await (supabaseAdmin.from("coupon_redemptions") as any)
      .select("id").eq("coupon_id", coupon.id).eq("redeemed_by_business", data.business_id).maybeSingle();
    if (existing) throw new Error("This business already used this code");

    // Compute commission if promoter attached
    let commissionCents = 0;
    let promoterId: string | null = coupon.promoter_id ?? null;
    if (promoterId) {
      const { data: promoter } = await (supabaseAdmin.from("promoters") as any)
        .select("commission_type, commission_value, status").eq("id", promoterId).maybeSingle();
      if (promoter && promoter.status === "approved") {
        // flat → value is cents. percent → not knowable yet (no $ amount), store 0.
        commissionCents = promoter.commission_type === "flat" ? (promoter.commission_value ?? 0) : 0;
      } else {
        promoterId = null;
      }
    }

    // Insert redemption (unique index will reject double-redeem race)
    const { error: redErr } = await (supabaseAdmin.from("coupon_redemptions") as any).insert({
      coupon_id: coupon.id,
      code: coupon.code,
      redeemed_by_user: userId,
      redeemed_by_business: data.business_id,
      addon_type: coupon.addon_type,
      promoter_id: promoterId,
      commission_cents: commissionCents,
      commission_status: commissionCents > 0 ? "pending" : "void",
    });
    if (redErr) throw new Error(redErr.message.includes("unique") ? "Already used by this business" : redErr.message);

    // Increment uses_count + mark redeemed/exhausted
    const newCount = (coupon.uses_count ?? 0) + 1;
    const newStatus = coupon.max_uses != null && newCount >= coupon.max_uses
      ? (coupon.max_uses === 1 ? "redeemed" : "exhausted")
      : "active";
    await (supabaseAdmin.from("admin_coupons") as any).update({
      uses_count: newCount,
      last_redeemed_at: nowIso,
      status: newStatus,
      // back-compat: fill single-use legacy columns on first use
      ...(coupon.uses_count === 0 ? {
        redeemed_by_user: userId,
        redeemed_by_business: data.business_id,
        redeemed_at: nowIso,
      } : {}),
    }).eq("id", coupon.id);

    // Apply the add-on
    const addonType = coupon.addon_type as AddonType;
    const now = new Date();
    const patch: Record<string, any> = {};

    if (addonType === "spott_extra_tags") {
      const base = biz.extra_tags_until && new Date(biz.extra_tags_until as string) > now
        ? new Date(biz.extra_tags_until as string) : now;
      patch.extra_tags_until = new Date(base.getTime() + 30 * 86400_000).toISOString();
    } else if (addonType === "spott_feature_7d_once") {
      const base = biz.featured_until && new Date(biz.featured_until as string) > now
        ? new Date(biz.featured_until as string) : now;
      patch.featured_until = new Date(base.getTime() + 7 * 86400_000).toISOString();
    } else if (addonType === "spott_bump_up_once") {
      const base = biz.bumped_until && new Date(biz.bumped_until as string) > now
        ? new Date(biz.bumped_until as string) : now;
      patch.bumped_until = new Date(base.getTime() + 24 * 3600_000).toISOString();
    } else if (addonType === "spott_photo_pack_once") {
      patch.photo_pack_bonus = ((biz as any).photo_pack_bonus ?? 0) + 10;
    } else if (addonType === "spott_pro_month" || addonType === "spott_business_month") {
      const priceId = addonType === "spott_pro_month" ? "spott_pro_monthly" : "spott_business_monthly";
      const periodEnd = new Date(now.getTime() + 30 * 86400_000).toISOString();
      await supabaseAdmin.from("subscriptions").insert({
        user_id: userId,
        stripe_subscription_id: `coupon_${coupon.id}_${Date.now()}`,
        stripe_customer_id: `coupon_${userId}`,
        product_id: "coupon_grant",
        price_id: priceId,
        status: "active",
        current_period_start: nowIso,
        current_period_end: periodEnd,
        cancel_at_period_end: true,
        environment: "live",
      });
    }

    if (Object.keys(patch).length > 0) {
      await (supabaseAdmin.from("businesses") as any).update(patch).eq("id", data.business_id);
    }

    return { ok: true, addon_type: addonType, business_name: biz.name };
  });
