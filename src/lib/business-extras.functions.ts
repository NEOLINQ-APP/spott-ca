import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { DAY_KEYS } from "@/lib/hours";

const DayHours = z.object({ open: z.string().regex(/^\d{1,2}:\d{2}$/), close: z.string().regex(/^\d{1,2}:\d{2}$/) }).nullable();
const HoursSchema = z.object({
  tz: z.string().max(64).optional(),
  mon: DayHours.optional(),
  tue: DayHours.optional(),
  wed: DayHours.optional(),
  thu: DayHours.optional(),
  fri: DayHours.optional(),
  sat: DayHours.optional(),
  sun: DayHours.optional(),
}).nullable();

const Input = z.object({
  business_id: z.string().uuid(),
  hours: HoursSchema.optional(),
  price_tier: z.number().int().min(1).max(5).nullable().optional(),
});

export const updateBusinessExtras = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => Input.parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: biz, error: bErr } = await supabase
      .from("businesses")
      .select("id, owner_id")
      .eq("id", data.business_id)
      .maybeSingle();
    if (bErr || !biz) throw new Error("Business not found");
    if (biz.owner_id !== userId) {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
      if (!isAdmin) throw new Error("Not authorized");
    }
    const patch: Record<string, any> = {};
    if (data.hours !== undefined) {
      if (data.hours === null) patch.hours = null;
      else {
        const clean: any = { tz: data.hours.tz ?? "America/Toronto" };
        for (const d of DAY_KEYS) clean[d] = data.hours[d] ?? null;
        patch.hours = clean;
      }
    }
    if (data.price_tier !== undefined) patch.price_tier = data.price_tier;
    if (Object.keys(patch).length === 0) return { ok: true };
    const { error } = await (supabase.from("businesses") as any).update(patch).eq("id", data.business_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
