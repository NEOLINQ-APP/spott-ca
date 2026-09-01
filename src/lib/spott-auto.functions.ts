// SPOTT Auto Phase 1: partner application + referral attribution. The
// click-time work (validate code, record the tracking event, set the
// cookie, redirect) happens in the raw r.$code.tsx server route, not here —
// this file is the post-auth side: attaching the referral once someone
// actually signs in, and the partner's own self-service application.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const REFERRAL_COOKIE = "spott_auto_ref";

/** Generates a partner referral code in the SP-XXXXXXXX shape used across
 * the spec, retrying on the (extremely unlikely) chance of a collision —
 * mirrors updatePromoter's code-gen-with-retry loop in promoters.functions.ts. */
async function generateUniqueReferralCode(
  supabaseAdmin: typeof import("@/integrations/supabase/client.server").supabaseAdmin,
): Promise<string> {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I ambiguity
  for (let attempt = 0; attempt < 10; attempt++) {
    let suffix = "";
    for (let i = 0; i < 8; i++) suffix += alphabet[Math.floor(Math.random() * alphabet.length)];
    const code = `SP-${suffix}`;
    const { data: existing } = await supabaseAdmin
      .from("spott_auto_partners")
      .select("id")
      .eq("referral_code", code)
      .maybeSingle();
    if (!existing) return code;
  }
  throw new Error("Could not generate a unique referral code — try again.");
}

/** Apply to become a SPOTT Auto partner. Self-service, lands as 'pending' —
 * an admin activates it via /admin/partners (mirrors the promoters
 * apply-then-approve flow). */
export const applyAsSpottAutoPartner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        display_name: z.string().trim().min(1).max(120),
        email: z.string().trim().email(),
        phone: z.string().trim().max(30).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("spott_auto_partners")
      .select("id, status, referral_code")
      .eq("user_id", userId)
      .maybeSingle();
    if (existing) return { ok: true, already: true, status: existing.status, referral_code: existing.referral_code };

    const referral_code = await generateUniqueReferralCode(supabaseAdmin);
    const { data: created, error } = await supabaseAdmin
      .from("spott_auto_partners")
      .insert({
        user_id: userId,
        display_name: data.display_name,
        email: data.email,
        phone: data.phone ?? null,
        status: "pending",
        referral_code,
      })
      .select("id, status, referral_code")
      .single();
    if (error || !created) throw new Error("Could not submit partner application — try again.");

    return { ok: true, already: false, status: created.status, referral_code: created.referral_code };
  });

/** My own partner row, if any — used by partner.dashboard/referral/leads
 * pages to know whether the signed-in user has (or can apply for) a
 * partner account. */
export const getMySpottAutoPartner = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("spott_auto_partners")
      .select("id, display_name, email, phone, status, referral_code, created_at")
      .eq("user_id", userId)
      .maybeSingle();
    return data ?? null;
  });

/**
 * Called client-side right after auth SIGNED_IN, same trigger point as
 * referrals.functions.ts's attachReferralOnSignup. Reads the referral code
 * from the httpOnly cookie set by r.$code.tsx — never from client input, so
 * it can't be spoofed by passing an arbitrary code. Idempotent via the
 * partial unique index on referred_user_id (upsert onConflict), matching
 * user_referrals' own first-touch-wins behavior.
 */
export const attachSpottAutoReferral = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;
    const { getCookie, deleteCookie } = await import("@tanstack/react-start/server");
    const code = getCookie(REFERRAL_COOKIE);
    if (!code) return { ok: false, reason: "no_cookie" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: partner } = await supabaseAdmin
      .from("spott_auto_partners")
      .select("id, user_id, status")
      .eq("referral_code", code)
      .maybeSingle();
    if (!partner || partner.status !== "active") return { ok: false, reason: "invalid_code" };
    if (partner.user_id === userId) return { ok: false, reason: "self_referral" };

    const { data: alreadyAttributed } = await supabaseAdmin
      .from("spott_auto_referrals")
      .select("id")
      .eq("referred_user_id", userId)
      .maybeSingle();
    if (alreadyAttributed) {
      deleteCookie(REFERRAL_COOKIE);
      return { ok: true, already: true };
    }

    const now = new Date();
    const expires = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const { error } = await supabaseAdmin
      .from("spott_auto_referrals")
      .upsert(
        {
          partner_id: partner.id,
          referral_code: code,
          referred_user_id: userId,
          source: "referral_link",
          status: "attributed",
          first_touch_at: now.toISOString(),
          expires_at: expires.toISOString(),
        },
        { onConflict: "referred_user_id" },
      );
    if (error) {
      console.error("[spott-auto] attachSpottAutoReferral insert failed", error);
      return { ok: false, reason: "insert_failed" };
    }

    deleteCookie(REFERRAL_COOKIE);
    return { ok: true, already: false };
  });

/** Resolves the caller's own partner_id server-side — every partner-facing
 * read below scopes through this, never through a client-supplied
 * partner_id, so one partner genuinely cannot read another's rows. */
async function resolveOwnPartnerId(
  supabaseAdmin: typeof import("@/integrations/supabase/client.server").supabaseAdmin,
  userId: string,
): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from("spott_auto_partners")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.id ?? null;
}

/** My own referrals — used for the dashboard's referral count + the
 * referral-center page. Real rows only, never fabricated. */
export const getMySpottAutoReferrals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const partnerId = await resolveOwnPartnerId(supabaseAdmin, context.userId);
    if (!partnerId) return [];
    const { data } = await supabaseAdmin
      .from("spott_auto_referrals")
      .select("id, status, source, first_touch_at, expires_at")
      .eq("partner_id", partnerId)
      .order("first_touch_at", { ascending: false })
      .limit(200);
    return data ?? [];
  });

/** My own financing_applications, joined through my own referrals — the
 * partner.leads page. Ownership check happens here, server-side, not via a
 * hidden UI filter. */
export const getMySpottAutoLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const partnerId = await resolveOwnPartnerId(supabaseAdmin, context.userId);
    if (!partnerId) return [];
    const { data } = await supabaseAdmin
      .from("financing_applications")
      .select("id, full_name, email, phone, city, province, status, vehicle_id, created_at")
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false })
      .limit(200);
    return data ?? [];
  });

/** Looks up the partner (if any) currently credited with referring this
 * signed-in user — used to attribute post-signup activity (vehicle views,
 * financing clicks, a submitted application) to the right partner. */
async function resolveAttributedPartner(
  supabaseAdmin: typeof import("@/integrations/supabase/client.server").supabaseAdmin,
  userId: string,
): Promise<{ partner_id: string | null; referral_id: string | null; referral_code: string | null }> {
  const { data } = await supabaseAdmin
    .from("spott_auto_referrals")
    .select("id, partner_id, referral_code")
    .eq("referred_user_id", userId)
    .maybeSingle();
  return { partner_id: data?.partner_id ?? null, referral_id: data?.id ?? null, referral_code: data?.referral_code ?? null };
}

/** Records one of the lightweight post-auth tracking events (vehicle view,
 * financing button click, referral link shared, etc.) — application_submitted
 * is recorded separately inside submitFinancingApplication, since it needs
 * the row it just created. Every insert goes through this service-role path,
 * never a direct client insert (spott_auto_tracking_events has no
 * authenticated INSERT policy on purpose). */
export const recordSpottAutoEvent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        event_type: z.enum(["vehicle_viewed", "financing_clicked", "application_started", "partner_share"]),
        resource_id: z.string().uuid().optional(),
        metadata: z.record(z.any()).optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const attributed = await resolveAttributedPartner(supabaseAdmin, context.userId);
    // No point logging a view/click no partner will ever see — only record
    // when this user is actually attributed to a partner.
    if (!attributed.partner_id) return { ok: true, recorded: false };

    await supabaseAdmin.from("spott_auto_tracking_events").insert({
      event_type: data.event_type,
      partner_id: attributed.partner_id,
      referral_code: attributed.referral_code,
      user_id: context.userId,
      resource_id: data.resource_id ?? null,
      metadata: data.metadata ?? {},
    });
    return { ok: true, recorded: true };
  });

const financingApplicationSchema = z.object({
  vehicle_id: z.string().uuid(),
  full_name: z.string().trim().min(1).max(160),
  email: z.string().trim().email(),
  phone: z.string().trim().max(30).optional(),
  city: z.string().trim().max(120).optional(),
  province: z.string().trim().max(60).optional(),
});

/** Real financing-application intake — replaces the vehicle detail page's
 * disabled "Financing inquiry — Soon" button. Attributes to whichever
 * partner (if any) referred this user; dealer_business_id is resolved from
 * the vehicle itself, never client-supplied. */
export const submitFinancingApplication = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => financingApplicationSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: vehicle } = await supabaseAdmin
      .from("vehicles")
      .select("id, dealer_business_id")
      .eq("id", data.vehicle_id)
      .maybeSingle();
    if (!vehicle) throw new Error("Vehicle not found.");

    const attributed = await resolveAttributedPartner(supabaseAdmin, context.userId);

    const { data: created, error } = await supabaseAdmin
      .from("financing_applications")
      .insert({
        referral_id: attributed.referral_id,
        partner_id: attributed.partner_id,
        vehicle_id: data.vehicle_id,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone ?? null,
        city: data.city ?? null,
        province: data.province ?? null,
        status: "submitted",
        dealer_business_id: vehicle.dealer_business_id,
      })
      .select("id")
      .single();
    if (error || !created) {
      console.error("[spott-auto] submitFinancingApplication insert failed", error);
      throw new Error("Could not submit your financing application — try again.");
    }

    await supabaseAdmin.from("spott_auto_tracking_events").insert({
      event_type: "application_submitted",
      partner_id: attributed.partner_id,
      referral_code: attributed.referral_code,
      user_id: context.userId,
      resource_id: data.vehicle_id,
      metadata: { financing_application_id: created.id },
    });

    // Best-effort, non-blocking — a logging no-op today (see
    // bario-one-lead-service.ts), never allowed to fail the real submission.
    const { barioOneLeadService } = await import("@/lib/bario-one-lead-service");
    barioOneLeadService
      .createLead({
        financing_application_id: created.id,
        partner_id: attributed.partner_id,
        full_name: data.full_name,
        email: data.email,
        phone: data.phone ?? null,
        city: data.city ?? null,
        province: data.province ?? null,
        vehicle_id: data.vehicle_id,
        status: "submitted",
      })
      .catch(() => {});

    return { ok: true, id: created.id };
  });
