// Admin-side SPOTT Auto partner management — list/activate/suspend. Mirrors
// promoters.functions.ts's assertAdmin + listPromoters/updatePromoter shape.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(
  supabaseAdmin: typeof import("@/integrations/supabase/client.server").supabaseAdmin,
  userId: string,
) {
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (!data) throw new Error("Admin only");
}

const STATUS_VALUES = ["pending", "active", "suspended", "inactive", "all"] as const;

export const listSpottAutoPartners = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ status: z.enum(STATUS_VALUES).optional() }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(supabaseAdmin, context.userId);

    let q = supabaseAdmin
      .from("spott_auto_partners")
      .select("id, user_id, display_name, email, phone, status, referral_code, created_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const updateSpottAutoPartnerStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["pending", "active", "suspended", "inactive"]),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(supabaseAdmin, context.userId);

    const { error } = await supabaseAdmin
      .from("spott_auto_partners")
      .update({ status: data.status, updated_at: new Date().toISOString() })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Referral + tracking-event activity for one partner, for the admin review
 * drawer. */
export const getSpottAutoPartnerActivity = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ partner_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await assertAdmin(supabaseAdmin, context.userId);

    const [{ data: referrals }, { data: events }, { data: applications }] = await Promise.all([
      supabaseAdmin
        .from("spott_auto_referrals")
        .select("id, status, source, first_touch_at")
        .eq("partner_id", data.partner_id)
        .order("first_touch_at", { ascending: false })
        .limit(100),
      supabaseAdmin
        .from("spott_auto_tracking_events")
        .select("id, event_type, created_at")
        .eq("partner_id", data.partner_id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabaseAdmin
        .from("financing_applications")
        .select("id, full_name, status, created_at")
        .eq("partner_id", data.partner_id)
        .order("created_at", { ascending: false })
        .limit(100),
    ]);

    return {
      referrals: referrals ?? [],
      events: events ?? [],
      applications: applications ?? [],
    };
  });
