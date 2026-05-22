import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const url = z.string().trim().url().max(500).optional().or(z.literal(""));

const Input = z.object({
  business_id: z.string().uuid(),
  links: z.object({
    pickup: url,
    doordash: url,
    ubereats: url,
    skip: url,
    delivery_other: url,
  }),
});

export const updateOrderingLinks = createServerFn({ method: "POST" })
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

    // Strip empty strings; keep only set links.
    const clean: Record<string, string> = {};
    for (const [k, v] of Object.entries(data.links)) {
      const t = (v ?? "").trim();
      if (t.length > 0) clean[k] = t;
    }

    const { error } = await (supabase.from("businesses") as any)
      .update({ ordering_links: clean })
      .eq("id", data.business_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
