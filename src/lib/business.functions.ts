import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const KeywordsInput = z.object({
  business_id: z.string().uuid(),
  keywords: z.array(z.string().min(1).max(40)).max(30),
});

export const updateBusinessKeywords = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => KeywordsInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const cleaned = Array.from(
      new Set(
        data.keywords
          .map((k) => k.toLowerCase().trim())
          .filter((k) => k.length >= 2 && k.length <= 40),
      ),
    );
    const { data: biz, error: bErr } = await supabase
      .from("businesses")
      .select("id, owner_id")
      .eq("id", data.business_id)
      .maybeSingle();
    if (bErr || !biz) throw new Error("Business not found");
    if (biz.owner_id !== userId) throw new Error("Not authorized");
    const { error } = await supabase
      .from("businesses")
      .update({ keywords: cleaned })
      .eq("id", data.business_id);
    if (error) throw new Error(error.message);
    return { keywords: cleaned };
  });
