import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { tierFromPriceId, TIER_LIMITS } from "@/lib/entitlements";

const upsertSchema = z.object({
  id: z.string().uuid().optional(),
  business_id: z.string().uuid(),
  title: z.string().min(2).max(120),
  description: z.string().max(800).optional().nullable(),
  discount_label: z.string().max(40).optional().nullable(),
  ends_at: z.string().datetime().optional().nullable(),
  is_active: z.boolean().optional(),
});

export const upsertSpecial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => upsertSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Ensure caller owns business
    const { data: biz } = await supabase
      .from("businesses").select("id, owner_id").eq("id", data.business_id).maybeSingle();
    if (!biz || biz.owner_id !== userId) throw new Error("Not your business");

    // Feature gating by tier
    const { data: sub } = await supabase
      .from("subscriptions").select("price_id,status,current_period_end")
      .eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle();
    const active = sub && (
      ["active", "trialing", "past_due"].includes(sub.status as string) &&
      (!sub.current_period_end || new Date(sub.current_period_end as string) > new Date())
    );
    const tier = active ? tierFromPriceId(sub!.price_id as string) : "free";
    const cap = TIER_LIMITS[tier].specials;

    if (!data.id) {
      const { count } = await supabase
        .from("specials").select("id", { count: "exact", head: true })
        .eq("business_id", data.business_id).eq("is_active", true);
      if ((count ?? 0) >= cap) {
        throw new Error(`Your plan allows ${cap} active special${cap === 1 ? "" : "s"}. Upgrade to add more.`);
      }
    }

    const payload = {
      business_id: data.business_id,
      title: data.title,
      description: data.description ?? null,
      discount_label: data.discount_label ?? null,
      ends_at: data.ends_at ?? null,
      is_active: data.is_active ?? true,
    };
    if (data.id) {
      const { error } = await supabase.from("specials").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { id: data.id };
    } else {
      const { data: row, error } = await supabase.from("specials").insert(payload).select("id").single();
      if (error) throw new Error(error.message);
      return { id: row.id as string };
    }
  });

export const deleteSpecial = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("specials").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
