import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Get my referral code + stats + list of my referrals. */
export const getMyReferrals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabase
      .from("profiles")
      .select("referral_code, display_name")
      .eq("id", userId)
      .maybeSingle();

    const { data: referrals } = await supabase
      .from("user_referrals")
      .select("id,status,created_at,qualified_at,rewarded_at,referred_user_id,reward_type,reward_applied_to")
      .eq("referrer_user_id", userId)
      .order("created_at", { ascending: false });

    const rows = referrals ?? [];
    const referredIds = rows.map((r) => r.referred_user_id);
    let refereeMap: Record<string, { display_name: string | null }> = {};
    if (referredIds.length) {
      const { data: refs } = await supabaseAdmin
        .from("profiles")
        .select("id, display_name")
        .in("id", referredIds);
      for (const p of refs ?? []) refereeMap[p.id] = { display_name: p.display_name };
    }

    return {
      referral_code: profile?.referral_code ?? null,
      display_name: profile?.display_name ?? null,
      share_url: profile?.referral_code
        ? `https://www.spott.ca/?ref=${profile.referral_code}`
        : null,
      totals: {
        total: rows.length,
        pending: rows.filter((r) => r.status === "pending").length,
        qualified: rows.filter((r) => r.status === "qualified").length,
        rewarded: rows.filter((r) => r.status === "rewarded").length,
      },
      referrals: rows.map((r) => ({
        ...r,
        referee_name: refereeMap[r.referred_user_id]?.display_name ?? "New member",
      })),
    };
  });

/**
 * Called client-side right after auth SIGNED_IN when a `spott_ref` code
 * exists in localStorage. Idempotent: only sets referred_by_code if empty,
 * then creates a pending user_referrals row.
 */
export const attachReferralOnSignup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ code: z.string().min(4).max(24) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const code = data.code.toUpperCase();

    const { data: me } = await supabase
      .from("profiles")
      .select("id, referred_by_code, referral_code")
      .eq("id", userId)
      .maybeSingle();
    if (!me) return { ok: false, reason: "no_profile" };
    if (me.referred_by_code) return { ok: true, already: true };
    if (me.referral_code === code) return { ok: false, reason: "self_referral" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: referrer } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("referral_code", code)
      .maybeSingle();
    if (!referrer || referrer.id === userId) return { ok: false, reason: "invalid_code" };

    await supabase.from("profiles").update({ referred_by_code: code } as never).eq("id", userId);

    await supabaseAdmin
      .from("user_referrals")
      .upsert(
        {
          referrer_user_id: referrer.id,
          referred_user_id: userId,
          referral_code: code,
          status: "pending",
        } as never,
        { onConflict: "referred_user_id" },
      );

    return { ok: true };
  });

/**
 * Redeem a qualified referral for 30 days of Featured on a listing/business
 * owned by the referrer. Flips status to 'rewarded' and stamps reward_applied_to.
 */
export const redeemReferralReward = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        referral_id: z.string().uuid(),
        target_type: z.enum(["business", "marketplace_listing"]),
        target_id: z.string().uuid(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: r } = await supabase
      .from("user_referrals")
      .select("id,status,referrer_user_id")
      .eq("id", data.referral_id)
      .maybeSingle();
    if (!r) return { ok: false, reason: "not_found" };
    if (r.referrer_user_id !== userId) return { ok: false, reason: "not_owner" };
    if (r.status !== "qualified") return { ok: false, reason: "not_qualified" };

    // Verify caller owns the target
    const until = new Date();
    until.setDate(until.getDate() + 30);
    const untilIso = until.toISOString();

    if (data.target_type === "business") {
      const { data: biz } = await supabaseAdmin
        .from("businesses")
        .select("id, owner_id, featured_until")
        .eq("id", data.target_id)
        .maybeSingle();
      if (!biz || biz.owner_id !== userId) return { ok: false, reason: "not_target_owner" };
      const base = biz.featured_until && new Date(biz.featured_until) > new Date()
        ? new Date(biz.featured_until)
        : new Date();
      base.setDate(base.getDate() + 30);
      await supabaseAdmin
        .from("businesses")
        .update({ featured_until: base.toISOString() } as never)
        .eq("id", data.target_id);
    } else {
      const { data: l } = await supabaseAdmin
        .from("marketplace_listings")
        .select("id, user_id, featured_until")
        .eq("id", data.target_id)
        .maybeSingle();
      if (!l || l.user_id !== userId) return { ok: false, reason: "not_target_owner" };
      const base = l.featured_until && new Date(l.featured_until) > new Date()
        ? new Date(l.featured_until)
        : new Date();
      base.setDate(base.getDate() + 30);
      await supabaseAdmin
        .from("marketplace_listings")
        .update({ featured_until: base.toISOString() } as never)
        .eq("id", data.target_id);
    }

    await supabaseAdmin
      .from("user_referrals")
      .update({
        status: "rewarded",
        rewarded_at: new Date().toISOString(),
        reward_type: "featured_30d",
        reward_applied_to: data.target_id,
      } as never)
      .eq("id", data.referral_id);

    return { ok: true, featured_until: untilIso };
  });
