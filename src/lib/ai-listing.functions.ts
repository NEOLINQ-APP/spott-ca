// One-push AI listing generation: user uploads real photos, Sparq (Luna)
// looks at them and drafts the listing — title, description, condition,
// and a price range (low-high, like a Blackbook-style vehicle quote,
// generalized to any marketplace item). Never auto-posts — the caller
// always reviews/edits before the real submit, same "assist, don't
// replace the human's final say" posture as the vehicle-leads AI
// valuation this mirrors.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateText } from "ai";
import { resolveAiModel } from "@/lib/ai-gateway";

const InputSchema = z.object({
  photo_urls: z.array(z.string().url()).min(1).max(8),
});

const CONDITION_VALUES = ["new", "like_new", "good", "fair", "poor"] as const;

export const generateListingFromPhotos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const prompt = `You are a marketplace listing assistant for Spott.ca, a Canadian classifieds marketplace. Examine the attached photo(s) of an item someone wants to sell.

Identify what the item is, assess its visible condition, and suggest a fair asking-price RANGE in CAD for the Canadian secondhand market — the low end for the item in worse-than-shown condition or a rushed sale, the high end for excellent condition and a patient sale. Base the range on real resale value for this kind of item, not the price of a new one.

Respond in strict JSON only, no markdown fences:
{"title":"<short listing title, max 80 chars>","description":"<2-4 sentence description of the item and its visible condition>","category_hint":"<one or two words for what kind of item this is, e.g. 'furniture', 'electronics', 'tires'>","condition":"<one of: new, like_new, good, fair, poor>","price_low_cents":<integer CAD cents>,"price_high_cents":<integer CAD cents>,"price_rationale":"<1 sentence explaining the range>"}`;

    const { text } = await generateText({
      model: resolveAiModel("google/gemini-3-flash-preview"),
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            ...data.photo_urls.map((url) => ({ type: "image" as const, image: url })),
          ],
        },
      ],
    });

    const cleaned = text.replace(/```json\s*|\s*```/g, "").trim();
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Could not generate a listing from these photos — try again or fill it in manually.");

    let parsed: any;
    try {
      parsed = JSON.parse(match[0]);
    } catch {
      throw new Error("Could not generate a listing from these photos — try again or fill it in manually.");
    }

    const condition = CONDITION_VALUES.includes(parsed.condition) ? parsed.condition : "good";
    const priceLowCents = Number(parsed.price_low_cents);
    const priceHighCents = Number(parsed.price_high_cents);
    if (!Number.isFinite(priceLowCents) || !Number.isFinite(priceHighCents)) {
      throw new Error("Could not generate a price estimate from these photos — try again or fill it in manually.");
    }

    // Best-effort category match against real categories — never invents
    // a category id, just suggests a starting point the user can change.
    let suggestedCategorySlug: string | null = null;
    let suggestedParentSlug: string | null = null;
    if (typeof parsed.category_hint === "string" && parsed.category_hint.trim()) {
      const { data: catMatch } = await supabaseAdmin
        .from("marketplace_categories")
        .select("slug, parent_slug")
        .ilike("name", `%${parsed.category_hint.trim().slice(0, 40)}%`)
        .limit(1)
        .maybeSingle();
      if (catMatch) {
        suggestedCategorySlug = catMatch.slug;
        suggestedParentSlug = catMatch.parent_slug;
      }
    }

    return {
      title: typeof parsed.title === "string" ? parsed.title.slice(0, 120) : "",
      description: typeof parsed.description === "string" ? parsed.description.slice(0, 2000) : "",
      condition,
      price_low_cents: Math.max(0, Math.round(priceLowCents)),
      price_high_cents: Math.max(0, Math.round(priceHighCents)),
      price_rationale: typeof parsed.price_rationale === "string" ? parsed.price_rationale.slice(0, 500) : "",
      suggested_category_slug: suggestedCategorySlug,
      suggested_parent_slug: suggestedParentSlug,
    };
  });
