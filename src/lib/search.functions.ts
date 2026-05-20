import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({
  query: z.string().min(1).max(120),
  category_slug: z.string().max(60).nullable().optional(),
  city: z.string().max(80).nullable().optional(),
});

export const trackSearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data, context }) => {
    await context.supabase.from("search_history").insert({
      user_id: context.userId,
      query: data.query,
      category_slug: data.category_slug ?? null,
      city: data.city ?? null,
    });
    return { ok: true };
  });
