import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const REASONS = [
  "spam",
  "harassment",
  "hate_or_discrimination",
  "false_information",
  "conflict_of_interest",
  "inappropriate_content",
  "other",
] as const;

const ReportSchema = z.object({
  review_id: z.string().uuid(),
  reason: z.enum(REASONS),
  details: z.string().max(1000).optional(),
});

export const reportReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ReportSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("review_reports").upsert(
      {
        review_id: data.review_id,
        reporter_id: userId,
        reason: data.reason,
        details: data.details ?? null,
        status: "pending",
      },
      { onConflict: "review_id,reporter_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

async function assertAdmin(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const isAdmin = (data ?? []).some((r: any) => r.role === "admin");
  if (!isAdmin) throw new Error("Admins only");
}

export const adminListReviewReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ status: z.enum(["pending", "reviewed", "dismissed", "actioned", "all"]).default("pending") }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    let q = supabase
      .from("review_reports")
      .select(
        "id,review_id,reporter_id,reason,details,status,admin_notes,reviewed_at,created_at," +
          "reviews(id,rating,body,is_hidden,hidden_reason,user_id,business_id,created_at,businesses(name,slug))",
      )
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);
    return { reports: rows ?? [] };
  });

export const adminModerateReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      review_id: z.string().uuid(),
      action: z.enum(["hide", "unhide", "delete"]),
      reason: z.string().max(300).optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    if (data.action === "delete") {
      const { error } = await supabase.from("reviews").delete().eq("id", data.review_id);
      if (error) throw new Error(error.message);
      return { ok: true, action: "delete" };
    }
    const patch =
      data.action === "hide"
        ? { is_hidden: true, hidden_reason: data.reason ?? null, hidden_at: new Date().toISOString(), hidden_by: userId }
        : { is_hidden: false, hidden_reason: null, hidden_at: null, hidden_by: null };
    const { error } = await supabase.from("reviews").update(patch).eq("id", data.review_id);
    if (error) throw new Error(error.message);
    return { ok: true, action: data.action };
  });

export const adminUpdateReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      report_id: z.string().uuid(),
      status: z.enum(["pending", "reviewed", "dismissed", "actioned"]),
      admin_notes: z.string().max(1000).optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);
    const { error } = await supabase
      .from("review_reports")
      .update({
        status: data.status,
        admin_notes: data.admin_notes ?? null,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", data.report_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
