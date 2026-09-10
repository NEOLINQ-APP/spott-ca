import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const CONTENT_TYPES = ["marketplace_listing", "vehicle", "event", "job_posting", "property"] as const;
const REASONS = ["spam", "scam_or_fraud", "prohibited_item", "offensive_content", "misleading_information", "duplicate", "other"] as const;

// Maps a content type to its real table + a title column for the admin
// queue, and the status value that means "removed by moderation" for
// that table's own real vocabulary (each type already had its own
// convention before this — no new shared field invented).
const CONTENT_TABLES: Record<(typeof CONTENT_TYPES)[number], { table: string; titleCol: string; removedStatus: string }> = {
  marketplace_listing: { table: "marketplace_listings", titleCol: "title", removedStatus: "removed" },
  vehicle: { table: "vehicles", titleCol: "title", removedStatus: "removed" },
  event: { table: "events", titleCol: "title", removedStatus: "rejected" },
  job_posting: { table: "job_postings", titleCol: "title", removedStatus: "removed" },
  property: { table: "properties", titleCol: "title", removedStatus: "removed" },
};

async function assertModerator(supabase: any, userId: string) {
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const roles = (data ?? []).map((r: any) => r.role);
  if (!roles.includes("admin") && !roles.includes("moderator")) throw new Error("Admins or moderators only");
}

const ReportSchema = z.object({
  content_type: z.enum(CONTENT_TYPES),
  content_id: z.string().uuid(),
  reason: z.enum(REASONS),
  details: z.string().max(1000).optional(),
});

export const reportContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => ReportSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase.from("content_reports").upsert(
      {
        content_type: data.content_type,
        content_id: data.content_id,
        reporter_id: userId,
        reason: data.reason,
        details: data.details ?? null,
        status: "pending",
      },
      { onConflict: "content_type,content_id,reporter_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminListContentReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ status: z.enum(["pending", "reviewed", "dismissed", "actioned", "all"]).default("pending") }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertModerator(supabase, userId);
    let q = supabase
      .from("content_reports")
      .select("id,content_type,content_id,reporter_id,reason,details,status,admin_notes,reviewed_at,created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Error(error.message);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const byType = new Map<string, string[]>();
    for (const r of rows ?? []) {
      const list = byType.get(r.content_type) ?? [];
      list.push(r.content_id);
      byType.set(r.content_type, list);
    }
    const titleMap = new Map<string, { title: string; status: string }>();
    for (const [type, ids] of byType) {
      const cfg = CONTENT_TABLES[type as keyof typeof CONTENT_TABLES];
      if (!cfg) continue;
      const { data: contentRows } = await (supabaseAdmin as any).from(cfg.table).select(`id,${cfg.titleCol},status`).in("id", ids);
      for (const c of (contentRows ?? []) as any[]) {
        titleMap.set(`${type}:${c.id}`, { title: c[cfg.titleCol] ?? "(untitled)", status: c.status });
      }
    }

    const reports = (rows ?? []).map((r: any) => ({
      ...r,
      content_title: titleMap.get(`${r.content_type}:${r.content_id}`)?.title ?? "(not found — may be deleted)",
      content_status: titleMap.get(`${r.content_type}:${r.content_id}`)?.status ?? null,
    }));
    return { reports };
  });

export const adminModerateContent = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      content_type: z.enum(CONTENT_TYPES),
      content_id: z.string().uuid(),
      action: z.enum(["remove", "restore"]),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertModerator(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cfg = CONTENT_TABLES[data.content_type];
    const newStatus = data.action === "remove" ? cfg.removedStatus : getDefaultActiveStatus(data.content_type);
    const { error } = await (supabaseAdmin as any).from(cfg.table).update({ status: newStatus }).eq("id", data.content_id);
    if (error) throw new Error(error.message);
    return { ok: true, action: data.action, newStatus };
  });

// "Restore" needs to know each table's real default-live status, since
// they don't all share one ("active" for marketplace/vehicles,
// "published" for events/jobs/properties).
function getDefaultActiveStatus(contentType: (typeof CONTENT_TYPES)[number]): string {
  return contentType === "marketplace_listing" || contentType === "vehicle" ? "active" : "published";
}

export const adminUpdateContentReport = createServerFn({ method: "POST" })
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
    await assertModerator(supabase, userId);
    const { error } = await supabase
      .from("content_reports")
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
