// SPOTT Auto Phase 2: the real Lead & Application Engine. Public,
// anonymous-capable (per spec section 10 — account creation happens AFTER
// submission, not as a gate before it), with save-and-continue via
// application_drafts (never localStorage for this data — spec section 28).
// submitApplication is the one atomic path that creates a real
// application + lead, locks partner attribution, records consent, and
// kicks off Bario One sync — nothing else writes financing_applications.
import { createServerFn } from "@tanstack/react-start";
import { getRequest, getRequestIP, getCookie, setCookie, deleteCookie } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { REFERRAL_COOKIE, resolveAttributedPartner } from "@/lib/spott-auto.functions";
import type { Database } from "@/integrations/supabase/types";

const SESSION_COOKIE = "spott_app_session";
const SESSION_COOKIE_MAX_AGE_SECONDS = 14 * 24 * 60 * 60;
// Bump this string whenever the consent copy/terms materially change —
// every consent_records row is stamped with whatever version was current
// at the moment consent was actually given.
const CONSENT_VERSION = "2026-09-01";
const MAX_SUBMISSIONS_PER_IP_PER_HOUR = 5;

/** Optional auth: resolves a userId from a Bearer token if the caller
 * happens to be signed in, but never requires one — same pattern
 * search.functions.ts's trackSearch already uses for optional
 * personalization on an otherwise-public endpoint. */
async function getOptionalUserId(): Promise<string | null> {
  const request = getRequest();
  const authHeader = request?.headers?.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.replace("Bearer ", "");
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!token || !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return null;
  const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data } = await supabase.auth.getClaims(token);
  return data?.claims?.sub ?? null;
}

function ensureSessionId(): string {
  let sid = getCookie(SESSION_COOKIE);
  if (!sid) {
    sid = crypto.randomUUID();
    setCookie(SESSION_COOKIE, sid, {
      maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "lax",
    });
  }
  return sid;
}

/** Anonymous or logged-in save-and-continue. */
export const saveApplicationDraft = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => z.object({ partial_data: z.record(z.string(), z.any()) }).parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = await getOptionalUserId();
    const sessionId = userId ? null : ensureSessionId();

    const existingQuery = supabaseAdmin.from("application_drafts").select("id");
    const { data: existing } = userId
      ? await existingQuery.eq("user_id", userId).maybeSingle()
      : await existingQuery.eq("session_id", sessionId!).is("user_id", null).maybeSingle();

    if (existing) {
      await supabaseAdmin
        .from("application_drafts")
        .update({ partial_data: data.partial_data, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabaseAdmin.from("application_drafts").insert({
        user_id: userId,
        session_id: sessionId,
        partial_data: data.partial_data,
      });
    }
    return { ok: true };
  });

/** Fired once when the wizard first mounts (step 0) — the real "started an
 * application" signal for partner analytics (spec section 33). Public/
 * anonymous-capable, unlike recordSpottAutoEvent in spott-auto.functions.ts
 * (which requires auth) — resolves the referring partner the same way
 * submitApplication does, straight from the referral cookie. */
export const recordApplicationStarted = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const refCode = getCookie(REFERRAL_COOKIE);
  if (!refCode) return { ok: true, recorded: false };

  const { data: partner } = await supabaseAdmin
    .from("spott_auto_partners")
    .select("id, status")
    .eq("referral_code", refCode)
    .maybeSingle();
  if (!partner || partner.status !== "active") return { ok: true, recorded: false };

  const userId = await getOptionalUserId();
  await supabaseAdmin.from("spott_auto_tracking_events").insert({
    event_type: "application_started",
    partner_id: partner.id,
    referral_code: refCode,
    user_id: userId,
    session_id: userId ? null : getCookie(SESSION_COOKIE) ?? ensureSessionId(),
  });
  return { ok: true, recorded: true };
});

export const getApplicationDraft = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const userId = await getOptionalUserId();
  const sessionId = userId ? null : getCookie(SESSION_COOKIE);
  if (!userId && !sessionId) return null;

  const query = supabaseAdmin.from("application_drafts").select("partial_data, updated_at");
  const { data } = userId
    ? await query.eq("user_id", userId).maybeSingle()
    : await query.eq("session_id", sessionId!).is("user_id", null).maybeSingle();
  return data ?? null;
});

const ConsentInput = z.object({
  application_submission: z.boolean(),
  contact_permission: z.boolean(),
  email_communication: z.boolean(),
  sms_communication: z.boolean(),
  privacy_policy: z.boolean(),
  terms_of_service: z.boolean(),
});

const SubmitApplicationInput = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(255),
  phone: z.string().trim().min(7).max(30),
  contact_preference: z.enum(["email", "phone", "sms"]),
  city: z.string().trim().max(120),
  province: z.string().trim().max(60),
  postal_code: z.string().trim().max(12),
  vehicle_interest: z.object({
    not_sure_yet: z.boolean().default(false),
    new_or_used: z.enum(["new", "used", "not_sure"]).optional(),
    vehicle_type: z.string().trim().max(60).optional(),
    make: z.string().trim().max(60).optional(),
    model: z.string().trim().max(60).optional(),
    year: z.number().int().min(1980).max(2100).optional(),
    budget_cents: z.number().int().min(0).max(1_000_000_000).optional(),
    down_payment_cents: z.number().int().min(0).max(1_000_000_000).optional(),
    trade_in: z.boolean().default(false),
    payment_frequency: z.enum(["weekly", "biweekly", "monthly"]).optional(),
    preferred_dealership_id: z.string().uuid().optional(),
  }),
  financing: z.object({
    employment_status: z.string().trim().max(60).optional(),
    employer: z.string().trim().max(120).optional(),
    employment_duration: z.string().trim().max(60).optional(),
    income_cents: z.number().int().min(0).max(1_000_000_000).optional(),
    housing_status: z.string().trim().max(60).optional(),
    monthly_housing_payment_cents: z.number().int().min(0).max(1_000_000_000).optional(),
    drivers_license_status: z.string().trim().max(60).optional(),
    additional_info: z.string().trim().max(2000).optional(),
  }),
  vehicle_id: z.string().uuid().optional(),
  consent: ConsentInput,
  utm_source: z.string().trim().max(120).optional(),
  utm_medium: z.string().trim().max(120).optional(),
  utm_campaign: z.string().trim().max(120).optional(),
});

/** The one real, atomic creation path. Never claims an approval, never
 * fabricates a Bario response — Bario sync is enqueued and its real
 * outcome is tracked asynchronously in bario_sync_records. */
export const submitApplication = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => SubmitApplicationInput.parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    if (!data.consent.application_submission || !data.consent.privacy_policy || !data.consent.terms_of_service) {
      throw new Error("Please accept the required consent items to submit your application.");
    }

    const ip = getRequestIP() ?? null;
    const sessionIdCookie = getCookie(SESSION_COOKIE) ?? null;

    if (ip) {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
      const { count } = await supabaseAdmin
        .from("consent_records")
        .select("application_id", { count: "exact", head: true })
        .eq("ip_address", ip)
        .eq("consent_type", "application_submission")
        .gte("created_at", oneHourAgo);
      if ((count ?? 0) >= MAX_SUBMISSIONS_PER_IP_PER_HOUR) {
        throw new Error("Too many applications submitted recently — please try again in a bit.");
      }
    }

    const userId = await getOptionalUserId();

    // Resolve + lock partner attribution: prefer an existing Phase 1
    // post-signup attach, fall back to reading the referral cookie
    // directly (the common anonymous-at-submission-time path).
    let partnerId: string | null = null;
    let referralId: string | null = null;
    if (userId) {
      const attributed = await resolveAttributedPartner(supabaseAdmin, userId);
      partnerId = attributed.partner_id;
      referralId = attributed.referral_id;
    }
    if (!partnerId) {
      const refCode = getCookie(REFERRAL_COOKIE);
      if (refCode) {
        const { data: partner } = await supabaseAdmin
          .from("spott_auto_partners")
          .select("id, status")
          .eq("referral_code", refCode)
          .maybeSingle();
        if (partner && partner.status === "active") partnerId = partner.id;
      }
    }
    const leadSource: string = partnerId ? "partner" : data.utm_source ? "campaign" : "direct";

    // Lead routing (spec section 15): auto-assign a dealership when an
    // active rule matches province/city/vehicle_type, highest priority
    // first. Never hard-coded — entirely admin-configured via
    // lead_routing_rules. No match just leaves it unassigned for an admin
    // to route manually later.
    let routedDealerBusinessId: string | null = null;
    {
      let rq = supabaseAdmin.from("lead_routing_rules").select("target_dealer_business_id, province, city, vehicle_type").eq("active", true).order("priority", { ascending: false });
      const { data: rules } = await rq;
      const vt = data.vehicle_interest.vehicle_type?.toLowerCase();
      const match = (rules ?? []).find((r) => {
        if (r.province && r.province.toUpperCase() !== data.province.toUpperCase()) return false;
        if (r.city && r.city.toLowerCase() !== data.city.toLowerCase()) return false;
        if (r.vehicle_type && r.vehicle_type.toLowerCase() !== vt) return false;
        return true;
      });
      routedDealerBusinessId = match?.target_dealer_business_id ?? null;
    }

    const fullName = `${data.first_name} ${data.last_name}`.trim();

    const { data: created, error } = await supabaseAdmin
      .from("financing_applications")
      .insert({
        partner_id: partnerId,
        referral_id: referralId,
        customer_id: userId,
        vehicle_id: data.vehicle_id ?? null,
        dealer_business_id: routedDealerBusinessId,
        full_name: fullName,
        email: data.email,
        phone: data.phone,
        city: data.city,
        province: data.province,
        postal_code: data.postal_code,
        contact_preference: data.contact_preference,
        lead_source: leadSource,
        utm_source: data.utm_source ?? null,
        utm_medium: data.utm_medium ?? null,
        utm_campaign: data.utm_campaign ?? null,
        status: "submitted",
      })
      .select("id, application_code")
      .single();
    if (error || !created) throw new Error("Could not submit your application — try again.");

    const applicationId = created.id;

    await supabaseAdmin.from("vehicle_interest").insert({
      application_id: applicationId,
      new_or_used: data.vehicle_interest.not_sure_yet ? "not_sure" : (data.vehicle_interest.new_or_used ?? null),
      vehicle_type: data.vehicle_interest.vehicle_type ?? null,
      make: data.vehicle_interest.make ?? null,
      model: data.vehicle_interest.model ?? null,
      year: data.vehicle_interest.year ?? null,
      budget_cents: data.vehicle_interest.budget_cents ?? null,
      down_payment_cents: data.vehicle_interest.down_payment_cents ?? null,
      trade_in: data.vehicle_interest.trade_in,
      payment_frequency: data.vehicle_interest.payment_frequency ?? null,
      preferred_dealership_id: data.vehicle_interest.preferred_dealership_id ?? null,
      not_sure_yet: data.vehicle_interest.not_sure_yet,
    });

    await supabaseAdmin.from("financing_application_details").insert({
      application_id: applicationId,
      employment_status: data.financing.employment_status ?? null,
      employer: data.financing.employer ?? null,
      employment_duration: data.financing.employment_duration ?? null,
      income_cents: data.financing.income_cents ?? null,
      housing_status: data.financing.housing_status ?? null,
      monthly_housing_payment_cents: data.financing.monthly_housing_payment_cents ?? null,
      drivers_license_status: data.financing.drivers_license_status ?? null,
      additional_info: data.financing.additional_info ?? null,
    });

    const consentTypes = Object.keys(data.consent) as (keyof typeof data.consent)[];
    await supabaseAdmin.from("consent_records").insert(
      consentTypes.map((type) => ({
        application_id: applicationId,
        consent_type: type,
        granted: data.consent[type],
        consent_version: CONSENT_VERSION,
        ip_address: ip,
        session_id: sessionIdCookie,
      })),
    );

    if (partnerId) {
      await supabaseAdmin.from("spott_auto_tracking_events").insert({
        event_type: "application_submitted",
        partner_id: partnerId,
        user_id: userId,
        session_id: userId ? null : sessionIdCookie,
        resource_id: applicationId,
      });
    }

    await supabaseAdmin.from("lead_activities").insert([
      { application_id: applicationId, activity_type: "application_submitted", description: "Customer submitted application" },
      {
        application_id: applicationId,
        activity_type: "attribution_confirmed",
        description: partnerId ? "Partner attribution confirmed" : "No partner attribution — organic/direct lead",
      },
      { application_id: applicationId, activity_type: "lead_created", description: `Lead created (${created.application_code})` },
    ]);

    if (userId) {
      await supabaseAdmin.from("application_drafts").delete().eq("user_id", userId);
    } else if (sessionIdCookie) {
      await supabaseAdmin.from("application_drafts").delete().eq("session_id", sessionIdCookie).is("user_id", null);
    }

    const { barioOneLeadService } = await import("@/lib/bario-one-lead-service");
    barioOneLeadService
      .createLead({
        financing_application_id: applicationId,
        partner_id: partnerId,
        full_name: fullName,
        email: data.email,
        phone: data.phone,
        city: data.city,
        province: data.province,
        vehicle_id: data.vehicle_id ?? null,
        status: "submitted",
      })
      .catch(() => {});

    const { sendEmail } = await import("@/lib/notifications.server");
    sendEmail({
      to: data.email,
      toName: data.first_name,
      subject: "Your Spott Auto application has been received",
      html: `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111">
        <h1 style="font-size:22px;margin:0 0 12px">We've received your application</h1>
        <p style="font-size:15px;line-height:1.5;color:#333">Thanks, ${data.first_name} — your application <strong>${created.application_code}</strong> has been securely submitted to help connect you with the appropriate automotive provider. We'll be in touch shortly.</p>
        <p style="font-size:13px;color:#666">This is a lead submission, not a financing decision — no approval has been made.</p>
      </div>`,
    }).catch(() => {});

    if (partnerId) {
      const vi = data.vehicle_interest;
      const vehicleLine = vi.make ? ` interested in a ${[vi.year, vi.make, vi.model].filter(Boolean).join(" ")}` : "";
      await supabaseAdmin.from("spott_auto_partner_notifications").insert({
        partner_id: partnerId,
        channel: "in_app",
        subject: "New lead received",
        body: `New lead in ${data.city}, ${data.province}${vehicleLine}.`,
        application_id: applicationId,
      });
    }

    return { ok: true, application_id: applicationId, application_code: created.application_code };
  });

/** Called post-signup, same trigger point as attachSpottAutoReferral /
 * attachReferralOnSignup — links an anonymously-submitted application to
 * the new account via the session cookie (never by email match, which
 * could misattribute a lead if two people share an inbox). */
export const attachApplicationToAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const sessionId = getCookie(SESSION_COOKIE);
    if (!sessionId) return { ok: false, reason: "no_session" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: consentRow } = await supabaseAdmin
      .from("consent_records")
      .select("application_id")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!consentRow) return { ok: false, reason: "no_application" };

    const { data: application } = await supabaseAdmin
      .from("financing_applications")
      .select("id, customer_id")
      .eq("id", consentRow.application_id)
      .maybeSingle();
    if (!application || application.customer_id) return { ok: false, reason: "already_linked_or_missing" };

    await supabaseAdmin.from("financing_applications").update({ customer_id: context.userId }).eq("id", application.id);
    deleteCookie(SESSION_COOKIE);
    return { ok: true };
  });

/** Customer dashboard "My Applications" tab. */
export const getMyApplicationStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("financing_applications")
      .select("id, application_code, status, created_at, vehicle_interest(make, model, year, not_sure_yet)")
      .eq("customer_id", context.userId)
      .order("created_at", { ascending: false });
    return data ?? [];
  });
