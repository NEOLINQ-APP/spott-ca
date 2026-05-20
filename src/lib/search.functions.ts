import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const schema = z.object({
  query: z.string().min(1).max(120),
  category_slug: z.string().max(60).nullable().optional(),
  city: z.string().max(80).nullable().optional(),
});

export const trackSearch = createServerFn({ method: "POST" })
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data }) => {
    // Optional auth: only track for signed-in users; no-op for anonymous.
    const request = getRequest();
    const authHeader = request?.headers?.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) return { ok: true };

    const token = authHeader.replace("Bearer ", "");
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!token || !SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) return { ok: true };

    const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    const { data: claims } = await supabase.auth.getClaims(token);
    const userId = claims?.claims?.sub;
    if (!userId) return { ok: true };

    await supabase.from("search_history").insert({
      user_id: userId,
      query: data.query,
      category_slug: data.category_slug ?? null,
      city: data.city ?? null,
    });
    return { ok: true };
  });
