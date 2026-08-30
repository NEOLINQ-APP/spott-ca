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
import { CONDITIONS } from "@/lib/marketplace";

const InputSchema = z.object({
  photo_urls: z.array(z.string().url()).min(1).max(8),
});

// Sourced from the same CONDITIONS the actual listing form's <select> uses
// (lib/marketplace.ts) rather than a separately-maintained list — the
// previous hardcoded ["new","like_new","good","fair","poor"] didn't match
// the form's real options (["new","like_new","used","for_parts"]) at all,
// so a value like "good" matched no <option>, and the browser silently
// fell back to displaying the first option ("New") regardless of what the
// AI actually determined (confirmed live 2026-08-29 — the generated
// description correctly said "used", the dropdown still showed "New").
const CONDITION_VALUES = CONDITIONS.map((c) => c.value);

export const generateListingFromPhotos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => InputSchema.parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Ground category selection in the real, current category list rather
    // than asking the model to freehand a word and fuzzy-matching it
    // against category names — that silently failed for anything whose
    // natural name doesn't literally appear inside a category name (e.g.
    // "bicycle" never matches, since the real category is "Sports
    // Equipment"; confirmed live 2026-08-29). Leaf (sub-)categories only,
    // since that's what the form actually requires the user to pick.
    const { data: categoryRows } = await supabaseAdmin
      .from("marketplace_categories")
      .select("slug, name, parent_slug")
      .not("parent_slug", "is", null);
    const leafCategories = categoryRows ?? [];
    const categoryListForPrompt = leafCategories.map((c) => `${c.slug} (${c.name})`).join(", ");

    const prompt = `You are a marketplace listing assistant for Spott.ca, a Canadian classifieds marketplace. Examine the attached photo(s) of an item someone wants to sell.

If multiple photos are attached, they're normally the SAME item from different angles — identify that one consistent item across all of them, don't pick a different item from each photo. Real photos of a real room or space usually contain other objects in the background (furniture, decor, other items) that are NOT for sale — focus on whichever single item is the clear, deliberate subject of the photo(s) (centered, in focus, closest to camera, or the only consistent object across multiple photos), not a smaller or incidental object elsewhere in the frame. If the photos genuinely seem to show more than one unrelated item for sale with no clear single subject, say so plainly in the description rather than guessing which one is intended.

Identify what the item is, assess its visible condition, and suggest a fair asking-price RANGE in CAD for the Canadian secondhand market — the low end for the item in worse-than-shown condition or a rushed sale, the high end for excellent condition and a patient sale. Base the range on real resale value for this kind of item, not the price of a new one.

STRICT rule for the "condition" field, which MUST be exactly one of: ${CONDITION_VALUES.join(", ")}. "new" requires unmistakable proof the item's never been used — tags still attached, still in original packaging/box, or a manufacturer/retail listing photo. A real-world photo of someone's actual item — on a floor, against a wall, outdoors, in a room — is NEVER "new", no matter how clean or well-kept it looks; use "like_new" for that instead. If your own description text says the item looks used, pre-owned, or not verifiably new, the condition field MUST NOT be "new" — keep the two consistent. When you can't verify something from the photo (brand, exact model, specs, age), don't guess or invent it — describe only what's actually visible, and say what should be confirmed by the buyer if relevant.

Pick the single best-matching category from this real list of Spott.ca categories (respond with its exact slug) — if genuinely nothing fits, use null:
${categoryListForPrompt}

Respond in strict JSON only, no markdown fences:
{"title":"<short listing title, max 80 chars>","description":"<2-4 sentence description of the item and its visible condition>","category_slug":"<one exact slug from the list above, or null>","packaging_or_tags_visible":<true only if tags, original box, or retail packaging are actually visible in the photo, else false>,"condition":"<new ONLY if tags/packaging/box visible in photo, else one of: ${CONDITION_VALUES.filter((v) => v !== "new").join(", ")}>","price_low_cents":<integer CAD cents>,"price_high_cents":<integer CAD cents>,"price_rationale":"<1 sentence explaining the range>"}`;

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

    // Deterministic backstop, not just a prompt instruction: "new" is only
    // trusted when the model also affirmed it saw real packaging/tag
    // evidence — a real-world item photo should never be able to produce
    // "new" on its own, regardless of how the model's condition field
    // itself came out (confirmed live 2026-08-29: the model can describe an
    // item as visibly used in its own prose while still emitting "new" in
    // the structured field — text-vs-field disagreement isn't something a
    // prompt alone reliably prevents).
    let condition: (typeof CONDITION_VALUES)[number] = CONDITION_VALUES.includes(parsed.condition) ? parsed.condition : "used";
    if (condition === "new" && parsed.packaging_or_tags_visible !== true) condition = "like_new";
    const priceLowCents = Number(parsed.price_low_cents);
    const priceHighCents = Number(parsed.price_high_cents);
    if (!Number.isFinite(priceLowCents) || !Number.isFinite(priceHighCents)) {
      throw new Error("Could not generate a price estimate from these photos — try again or fill it in manually.");
    }

    // Never trust the model's slug blindly — only apply it if it's a real,
    // exact match against the same list it was given, so a hallucinated or
    // slightly-off slug never silently sets a wrong category.
    let suggestedCategorySlug: string | null = null;
    let suggestedParentSlug: string | null = null;
    if (typeof parsed.category_slug === "string") {
      const catMatch = leafCategories.find((c) => c.slug === parsed.category_slug);
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
