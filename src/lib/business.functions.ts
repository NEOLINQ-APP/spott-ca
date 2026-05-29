import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const FREE_TAG_LIMIT = 4;
const EXTRA_TAG_LIMIT = 12;

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
      .select("id, owner_id, extra_tags_until")
      .eq("id", data.business_id)
      .maybeSingle();
    if (bErr || !biz) throw new Error("Business not found");

    let isOwner = biz.owner_id === userId;
    if (!isOwner) {
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
      if (!isAdmin) throw new Error("Not authorized");
      isOwner = true;
    }

    const hasExtra = !!biz.extra_tags_until && new Date(biz.extra_tags_until as string) > new Date();
    const max = hasExtra ? EXTRA_TAG_LIMIT : FREE_TAG_LIMIT;
    if (cleaned.length > max) {
      throw new Error(
        hasExtra
          ? `Tag limit is ${EXTRA_TAG_LIMIT} on the Extra Tags plan.`
          : `Free plan is limited to ${FREE_TAG_LIMIT} tags. Upgrade to Extra Tags for ${EXTRA_TAG_LIMIT} total.`,
      );
    }

    const { error } = await (supabase.from("businesses") as any)
      .update({ keywords: cleaned })
      .eq("id", data.business_id);
    if (error) throw new Error(error.message);
    return { keywords: cleaned, max, hasExtra };
  });

export const getBusinessTagInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ business_id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: biz } = await supabase
      .from("businesses")
      .select("keywords, extra_tags_until")
      .eq("id", data.business_id)
      .maybeSingle();
    const hasExtra = !!biz?.extra_tags_until && new Date(biz.extra_tags_until as string) > new Date();
    return {
      used: (biz?.keywords ?? []).length,
      max: hasExtra ? EXTRA_TAG_LIMIT : FREE_TAG_LIMIT,
      hasExtra,
      extraTagsUntil: biz?.extra_tags_until ?? null,
    };
  });
