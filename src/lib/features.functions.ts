import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const UpdateInput = z.object({
  business_id: z.string().uuid(),
  feature_ids: z.array(z.string().uuid()).max(100),
  highlighted_ids: z.array(z.string().uuid()).max(2),
});

export const updateBusinessFeatures = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => UpdateInput.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: biz, error: bErr } = await supabase
      .from("businesses")
      .select("id, owner_id, featured_highlights_until")
      .eq("id", data.business_id)
      .maybeSingle();
    if (bErr || !biz) throw new Error("Business not found");

    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
    if (biz.owner_id !== userId && !isAdmin) throw new Error("Not authorized");

    // Ensure all highlighted are in selected set
    const featSet = new Set(data.feature_ids);
    for (const h of data.highlighted_ids) {
      if (!featSet.has(h)) throw new Error("Highlighted feature must be selected");
    }

    // Highlights gated by paid window (skip for admins)
    const now = Date.now();
    const until = (biz as any).featured_highlights_until ? new Date((biz as any).featured_highlights_until).getTime() : 0;
    const highlightsAllowed = isAdmin || until > now;
    const highlightedIds = highlightsAllowed ? data.highlighted_ids : [];

    // Wipe + re-insert
    const { error: dErr } = await (supabase.from("business_features") as any).delete().eq("business_id", data.business_id);
    if (dErr) throw new Error(dErr.message);

    if (data.feature_ids.length > 0) {
      const rows = data.feature_ids.map((fid) => ({
        business_id: data.business_id,
        feature_id: fid,
        is_highlighted: highlightedIds.includes(fid),
      }));
      const { error: iErr } = await (supabase.from("business_features") as any).insert(rows);
      if (iErr) throw new Error(iErr.message);
    }

    return { ok: true, highlights_applied: highlightedIds.length };
  });
