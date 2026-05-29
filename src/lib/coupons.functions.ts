import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

// Coupons grant 30 days of an add-on for free.
// addon_type values:
//   - spott_extra_tags        → extends businesses.extra_tags_until +30d
//   - spott_bump_up_once      → extends businesses.bumped_until +24h
//   - spott_feature_7d_once   → extends businesses.featured_until +7d
//   - spott_photo_pack_once   → adds 10 to businesses.photo_pack_bonus
//   - spott_pro_month         → grants 30d of Pro (via subscriptions row)
//   - spott_business_month    → grants 30d of Business (via subscriptions row)

const ADDON_TYPES = [
  "spott_extra_tags",
  "spott_bump_up_once",
  "spott_feature_7d_once",
  "spott_photo_pack_once",
  "spott_pro_month",
  "spott_business_month",
] as const;
type AddonType = typeof ADDON_TYPES[number];

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
    addon_type: z.enum(ADDON_TYPES),
    notes: z.string().max(500).optional(),
    expires_in_days: z.number().int().min(1).max(365).optional(),
    code: z.string().min(4).max(32).regex(/^[A-Z0-9_-]+$/i).optional(),
  }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const code = (data.code || genCode()).toUpperCase();
    const expires_at = data.expires_in_days
      ? new Date(Date.now() + data.expires_in_days * 86400_000).toISOString()
      : null;
    const { data: row, error } = await supabaseAdmin.from("admin_coupons").insert({
      code,
      addon_type: data.addon_type,
      notes: data.notes ?? null,
      expires_at,
      created_by: context.userId,
    }).select().single();
    if (error) throw new Error(error.message);
    return row;
  });

export const listCoupons = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("admin_coupons")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const revokeCoupon = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("admin_coupons")
      .update({ status: "revoked" })
      .eq("id", data.id)
      .eq("status", "active");
    if (error) throw new Error(error.message);
    return { ok: true };
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

    // Verify business ownership
    const { data: biz } = await supabaseAdmin
      .from("businesses")
      .select("id, owner_id, extra_tags_until, featured_until, bumped_until, photo_pack_bonus")
      .eq("id", data.business_id)
      .maybeSingle();
    if (!biz) throw new Error("Business not found");
    if (biz.owner_id !== userId) throw new Error("You don't own this business");

    // Atomically claim the coupon
    const nowIso = new Date().toISOString();
    const { data: claimed, error: claimErr } = await supabaseAdmin
      .from("admin_coupons")
      .update({
        status: "redeemed",
        redeemed_by_user: userId,
        redeemed_by_business: data.business_id,
        redeemed_at: nowIso,
      })
      .eq("code", code)
      .eq("status", "active")
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .select()
      .single();
    if (claimErr || !claimed) throw new Error("Invalid, expired, or already-used code");

    const addonType = claimed.addon_type as AddonType;
    const now = new Date();
    const patch: Record<string, any> = {};

    if (addonType === "spott_extra_tags") {
      const base = biz.extra_tags_until && new Date(biz.extra_tags_until as string) > now
        ? new Date(biz.extra_tags_until as string)
        : now;
      patch.extra_tags_until = new Date(base.getTime() + 30 * 86400_000).toISOString();
    } else if (addonType === "spott_feature_7d_once") {
      const base = biz.featured_until && new Date(biz.featured_until as string) > now
        ? new Date(biz.featured_until as string)
        : now;
      patch.featured_until = new Date(base.getTime() + 7 * 86400_000).toISOString();
    } else if (addonType === "spott_bump_up_once") {
      const base = biz.bumped_until && new Date(biz.bumped_until as string) > now
        ? new Date(biz.bumped_until as string)
        : now;
      patch.bumped_until = new Date(base.getTime() + 24 * 3600_000).toISOString();
    } else if (addonType === "spott_photo_pack_once") {
      patch.photo_pack_bonus = ((biz as any).photo_pack_bonus ?? 0) + 10;
    } else if (addonType === "spott_pro_month" || addonType === "spott_business_month") {
      // Grant 30d subscription via subscriptions row
      const priceId = addonType === "spott_pro_month" ? "spott_pro_monthly" : "spott_business_monthly";
      const periodEnd = new Date(now.getTime() + 30 * 86400_000).toISOString();
      await supabaseAdmin.from("subscriptions").insert({
        user_id: userId,
        stripe_subscription_id: `coupon_${claimed.id}`,
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
      await supabaseAdmin.from("businesses").update(patch).eq("id", data.business_id);
    }

    return { ok: true, addon_type: addonType };
  });
