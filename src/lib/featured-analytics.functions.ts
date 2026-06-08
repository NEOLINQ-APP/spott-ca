import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const EVENT = z.object({
  business_id: z.string().uuid(),
  event_type: z.enum(["impression", "click"]),
  source: z.enum(["homepage", "search", "directory", "category", "city", "marketplace", "other"]),
  section: z.string().max(40).nullable().optional(),
});

/** Public: track a single featured placement event. Anonymous OK. */
export const trackPlacementEvent = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) => EVENT.parse(i))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("featured_placement_events").insert({
      business_id: data.business_id,
      event_type: data.event_type,
      source: data.source,
      section: data.section ?? null,
    });
    return { ok: true };
  });

/** Public: batch-track impressions (one network call per render). */
export const trackPlacementImpressions = createServerFn({ method: "POST" })
  .inputValidator((i: unknown) =>
    z.object({
      business_ids: z.array(z.string().uuid()).min(1).max(50),
      source: z.enum(["homepage", "search", "directory", "category", "city", "marketplace", "other"]),
      section: z.string().max(40).nullable().optional(),
    }).parse(i),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const rows = data.business_ids.map((business_id) => ({
      business_id, event_type: "impression" as const, source: data.source, section: data.section ?? null,
    }));
    await supabaseAdmin.from("featured_placement_events").insert(rows);
    return { ok: true, count: rows.length };
  });

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles").select("role").eq("user_id", userId).eq("role", "admin").maybeSingle();
  if (!data) throw new Error("Admin only");
}

type Summary = {
  business_id: string;
  name: string;
  slug: string;
  impressions: number;
  clicks: number;
  ctr: number;
};

function summarize(rows: { business_id: string; event_type: string }[], meta: Map<string, { name: string; slug: string }>): Summary[] {
  const counts = new Map<string, { impressions: number; clicks: number }>();
  for (const r of rows) {
    const c = counts.get(r.business_id) ?? { impressions: 0, clicks: 0 };
    if (r.event_type === "impression") c.impressions++;
    else if (r.event_type === "click") c.clicks++;
    counts.set(r.business_id, c);
  }
  const out: Summary[] = [];
  for (const [business_id, c] of counts) {
    const m = meta.get(business_id);
    if (!m) continue;
    out.push({
      business_id, name: m.name, slug: m.slug,
      impressions: c.impressions, clicks: c.clicks,
      ctr: c.impressions ? c.clicks / c.impressions : 0,
    });
  }
  return out.sort((a, b) => b.impressions - a.impressions);
}

/** Owner: analytics summary for businesses they own (last 30 days). */
export const ownerPlacementAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ days: z.number().int().min(1).max(365).default(30) }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: bizs } = await supabase
      .from("businesses").select("id, name, slug").eq("owner_id", userId);
    const ids = (bizs ?? []).map((b: any) => b.id);
    if (!ids.length) return { rows: [] as Summary[], totals: { impressions: 0, clicks: 0, ctr: 0 } };

    const since = new Date(Date.now() - data.days * 86400000).toISOString();
    const { data: events } = await supabase
      .from("featured_placement_events")
      .select("business_id, event_type")
      .gte("created_at", since)
      .in("business_id", ids);

    const meta = new Map((bizs ?? []).map((b: any) => [b.id, { name: b.name, slug: b.slug }]));
    const rows = summarize((events ?? []) as any, meta);
    const totals = rows.reduce(
      (acc, r) => ({ impressions: acc.impressions + r.impressions, clicks: acc.clicks + r.clicks, ctr: 0 }),
      { impressions: 0, clicks: 0, ctr: 0 },
    );
    totals.ctr = totals.impressions ? totals.clicks / totals.impressions : 0;
    return { rows, totals };
  });

/** Admin: site-wide analytics summary. */
export const adminPlacementAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ days: z.number().int().min(1).max(365).default(30) }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const since = new Date(Date.now() - data.days * 86400000).toISOString();
    const { data: events } = await supabaseAdmin
      .from("featured_placement_events")
      .select("business_id, event_type, source")
      .gte("created_at", since)
      .limit(50000);
    const ids = Array.from(new Set((events ?? []).map((e: any) => e.business_id)));
    const { data: bizs } = ids.length
      ? await supabaseAdmin.from("businesses").select("id, name, slug").in("id", ids)
      : { data: [] as any[] };
    const meta = new Map((bizs ?? []).map((b: any) => [b.id, { name: b.name, slug: b.slug }]));
    const rows = summarize((events ?? []) as any, meta);
    const bySource: Record<string, { impressions: number; clicks: number }> = {};
    for (const e of (events ?? []) as any[]) {
      const s = bySource[e.source] ?? { impressions: 0, clicks: 0 };
      if (e.event_type === "impression") s.impressions++;
      else if (e.event_type === "click") s.clicks++;
      bySource[e.source] = s;
    }
    const totals = rows.reduce(
      (acc, r) => ({ impressions: acc.impressions + r.impressions, clicks: acc.clicks + r.clicks, ctr: 0 }),
      { impressions: 0, clicks: 0, ctr: 0 },
    );
    totals.ctr = totals.impressions ? totals.clicks / totals.impressions : 0;
    return { rows: rows.slice(0, 100), totals, bySource };
  });
