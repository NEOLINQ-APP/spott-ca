// SPOTT Lead Center (admin). Separate from the older, unrelated
// admin.leads.tsx/vehicle_leads pages — left untouched for Phase 1/pre-Phase-1
// compatibility. Server-side pagination + multi-field search mirrors
// adminListVehicles in admin-content.functions.ts (the one proven pattern
// in this codebase), applied to financing_applications.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(
  supabaseAdmin: typeof import("@/integrations/supabase/client.server").supabaseAdmin,
  userId: string,
) {
  const { data } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Admin only");
}

async function audit(
  supabaseAdmin: typeof import("@/integrations/supabase/client.server").supabaseAdmin,
  actorId: string,
  action: string,
  targetType: string,
  targetId: string,
  before: unknown,
  after: unknown,
  reason?: string,
) {
  await supabaseAdmin.from("admin_audit_log").insert({
    actor_id: actorId,
    action,
    target_type: targetType,
    target_id: targetId,
    before: before as never,
    after: after as never,
    reason: reason ?? null,
  });
}

export const listLeads = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        search: z.string().optional(),
        status: z.string().optional(),
        sync_status: z.string().optional(),
        province: z.string().optional(),
        city: z.string().optional(),
        partner_id: z.string().uuid().optional(),
        campaign_id: z.string().uuid().optional(),
        dealer_business_id: z.string().uuid().optional(),
        vehicle_type: z.string().optional(),
        date_from: z.string().optional(),
        date_to: z.string().optional(),
        limit: z.number().min(1).max(200).default(50),
        offset: z.number().min(0).default(0),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(supabaseAdmin, context.userId);

    let q = supabaseAdmin
      .from("financing_applications")
      .select(
        "id, application_code, full_name, email, phone, city, province, status, lead_source, partner_id, campaign_id, dealer_business_id, created_at, last_activity_at, bario_sync_records(status), vehicle_interest(make, model, year, vehicle_type)",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(data.offset, data.offset + data.limit - 1);

    if (data.status) q = q.eq("status", data.status);
    if (data.province) q = q.eq("province", data.province);
    if (data.city) q = q.ilike("city", data.city);
    if (data.partner_id) q = q.eq("partner_id", data.partner_id);
    if (data.campaign_id) q = q.eq("campaign_id", data.campaign_id);
    if (data.dealer_business_id) q = q.eq("dealer_business_id", data.dealer_business_id);
    if (data.date_from) q = q.gte("created_at", data.date_from);
    if (data.date_to) q = q.lte("created_at", data.date_to);
    if (data.search && data.search.trim()) {
      const term = data.search.trim();
      q = q.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,application_code.ilike.%${term}%`);
    }

    const { data: rows, count } = await q;

    // vehicle_type and sync_status filters need the joined tables, which
    // PostgREST can't filter with .eq() the same way — apply them in
    // memory on the already-paginated page (fine at this scale; a fully
    // server-side version would need a view/RPC, not needed yet).
    let filtered = rows ?? [];
    if (data.vehicle_type) {
      filtered = filtered.filter((r: any) => r.vehicle_interest?.vehicle_type === data.vehicle_type);
    }
    if (data.sync_status) {
      filtered = filtered.filter((r: any) => r.bario_sync_records?.status === data.sync_status);
    }

    return { rows: filtered, count: count ?? 0 };
  });

export const getLeadDetail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(supabaseAdmin, context.userId);

    const { data: application } = await supabaseAdmin
      .from("financing_applications")
      .select(
        "id, referral_id, partner_id, vehicle_id, full_name, email, phone, city, province, postal_code, status, dealer_business_id, created_at, updated_at, application_code, customer_id, lead_source, campaign_id, utm_source, utm_medium, utm_campaign, contact_preference, assigned_salesperson, notes, last_activity_at, spott_auto_partners(id, display_name, referral_code), campaigns(id, name), businesses(id, name)",
      )
      .eq("id", data.id)
      .maybeSingle();
    if (!application) throw new Error("Lead not found");

    const [{ data: vehicleInterest }, { data: financingDetails }, { data: consent }, { data: activities }, { data: syncRecord }] =
      await Promise.all([
        supabaseAdmin.from("vehicle_interest").select("*").eq("application_id", data.id).maybeSingle(),
        supabaseAdmin.from("financing_application_details").select("*").eq("application_id", data.id).maybeSingle(),
        supabaseAdmin.from("consent_records").select("*").eq("application_id", data.id).order("created_at"),
        supabaseAdmin.from("lead_activities").select("*").eq("application_id", data.id).order("created_at"),
        supabaseAdmin.from("bario_sync_records").select("*").eq("application_id", data.id).maybeSingle(),
      ]);

    return {
      application,
      vehicle_interest: vehicleInterest ?? null,
      financing_details: financingDetails ?? null,
      // ip_address is Postgres `inet`, which the generated client type
      // widens to `unknown` — coerce to a plain string so the server
      // function's return value passes TanStack Start's serializability
      // check (the real value already comes back as a string over the wire).
      consent: (consent ?? []).map((c) => ({ ...c, ip_address: c.ip_address == null ? null : String(c.ip_address) })),
      activities: activities ?? [],
      sync_record: syncRecord ?? null,
    };
  });

export const assignLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ id: z.string().uuid(), dealer_business_id: z.string().uuid().nullable(), salesperson: z.string().trim().max(120).optional() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(supabaseAdmin, context.userId);

    const { data: before } = await supabaseAdmin
      .from("financing_applications")
      .select("dealer_business_id, assigned_salesperson, status")
      .eq("id", data.id)
      .maybeSingle();

    const patch: Record<string, unknown> = {
      dealer_business_id: data.dealer_business_id,
      assigned_salesperson: data.salesperson ?? null,
      last_activity_at: new Date().toISOString(),
    };
    if (data.dealer_business_id && before?.status === "submitted") patch.status = "dealership_assigned";

    await supabaseAdmin.from("financing_applications").update(patch as never).eq("id", data.id);
    await supabaseAdmin.from("lead_activities").insert({
      application_id: data.id,
      activity_type: "dealership_assigned",
      actor_id: context.userId,
      description: data.dealer_business_id ? "Dealership assigned" : "Dealership assignment cleared",
      previous_state: before as never,
      new_state: patch as never,
    });
    await audit(supabaseAdmin, context.userId, "lead.assign", "financing_application", data.id, before, patch);
    return { ok: true };
  });

export const addLeadNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid(), note: z.string().trim().min(1).max(4000) }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(supabaseAdmin, context.userId);

    await supabaseAdmin.from("financing_applications").update({ notes: data.note, last_activity_at: new Date().toISOString() }).eq("id", data.id);
    await supabaseAdmin.from("lead_activities").insert({
      application_id: data.id,
      activity_type: "internal_note",
      actor_id: context.userId,
      description: "Internal note added",
      new_state: { note: data.note } as never,
      is_internal: true,
    });
    return { ok: true };
  });

export const updateLeadStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum([
          "submitted", "received", "under_review", "contacted", "dealership_assigned",
          "appointment_requested", "appointment_set", "in_progress", "completed", "cancelled",
        ]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(supabaseAdmin, context.userId);

    const { data: before } = await supabaseAdmin.from("financing_applications").select("status").eq("id", data.id).maybeSingle();
    await supabaseAdmin
      .from("financing_applications")
      .update({ status: data.status, last_activity_at: new Date().toISOString() })
      .eq("id", data.id);
    await supabaseAdmin.from("lead_activities").insert({
      application_id: data.id,
      activity_type: "status_changed",
      actor_id: context.userId,
      description: `Status changed to ${data.status.replace(/_/g, " ")}`,
      previous_state: before as never,
      new_state: { status: data.status } as never,
    });
    await audit(supabaseAdmin, context.userId, "lead.status_change", "financing_application", data.id, before, { status: data.status });
    return { ok: true };
  });

/** Forces an immediate re-attempt (rather than waiting on the message's
 * natural visibility-timeout retry) — same effective outcome as the
 * background worker's own retry, just triggered on demand from the admin
 * UI. */
export const retryBarioSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(supabaseAdmin, context.userId);

    await supabaseAdmin
      .from("bario_sync_records")
      .upsert({ application_id: data.id, status: "pending", retry_count: 0, last_error: null }, { onConflict: "application_id" });

    const { error } = await supabaseAdmin.rpc("enqueue_bario_lead_sync", {
      queue_name: "bario_lead_sync",
      payload: { event_type: "financing_lead.created", application_id: data.id, queued_at: new Date().toISOString() },
    });
    if (error) throw new Error("Could not queue a retry — try again.");

    await supabaseAdmin.from("lead_activities").insert({
      application_id: data.id,
      activity_type: "bario_sync",
      actor_id: context.userId,
      description: "Bario One synchronization manually retried by admin",
      is_internal: true,
    });
    return { ok: true };
  });

export const searchDealerBusinesses = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ q: z.string().trim().min(1).max(120) }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(supabaseAdmin, context.userId);
    const { data: rows } = await supabaseAdmin
      .from("businesses")
      .select("id, name, city, province")
      .ilike("name", `%${data.q}%`)
      .limit(10);
    return rows ?? [];
  });

export const listCampaignsForFilter = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(supabaseAdmin, context.userId);
    const { data } = await supabaseAdmin.from("campaigns").select("id, name").order("name");
    return data ?? [];
  });

export const getLeadCenterAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(supabaseAdmin, context.userId);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(startOfToday.getTime() - 7 * 24 * 60 * 60 * 1000);
    const startOfMonth = new Date(startOfToday.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [{ count: total }, { count: today }, { count: week }, { count: month }, { data: statusRows }, { data: syncRows }] = await Promise.all([
      supabaseAdmin.from("financing_applications").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("financing_applications").select("id", { count: "exact", head: true }).gte("created_at", startOfToday.toISOString()),
      supabaseAdmin.from("financing_applications").select("id", { count: "exact", head: true }).gte("created_at", startOfWeek.toISOString()),
      supabaseAdmin.from("financing_applications").select("id", { count: "exact", head: true }).gte("created_at", startOfMonth.toISOString()),
      supabaseAdmin.from("financing_applications").select("status"),
      supabaseAdmin.from("bario_sync_records").select("status"),
    ]);

    const byStatus: Record<string, number> = {};
    for (const r of statusRows ?? []) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    const syncSynced = (syncRows ?? []).filter((r) => r.status === "synced").length;
    const syncFailed = (syncRows ?? []).filter((r) => r.status === "failed").length;
    const syncTotal = (syncRows ?? []).length;

    return {
      total_applications: total ?? 0,
      applications_today: today ?? 0,
      applications_this_week: week ?? 0,
      applications_this_month: month ?? 0,
      by_status: byStatus,
      bario_sync_success_rate: syncTotal ? Math.round((syncSynced / syncTotal) * 100) : null,
      bario_sync_failures: syncFailed,
    };
  });
