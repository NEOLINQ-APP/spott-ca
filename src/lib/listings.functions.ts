import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { generateObject } from "ai";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway";

const InputSchema = z.object({
  name: z.string().min(1).max(120),
  city: z.string().min(1).max(80),
  province: z.string().min(2).max(40),
  pitch: z.string().min(5).max(600),
});

const DraftSchema = z.object({
  description: z.string(),
  category_slug: z.enum([
    "restaurants-food",
    "beauty-personal-care",
    "health-wellness",
    "home-services",
    "automotive",
    "professional-services",
    "shopping-retail",
    "events-entertainment",
  ]),
  tagline: z.string(),
  keywords: z.array(z.string()).default([]),
});

function slugify(s: string) {
  const base = s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60);
  const rand = Math.random().toString(36).slice(2, 7);
  return `${base || "biz"}-${rand}`;
}

export const generateListingDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => InputSchema.parse(input))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");
    const gateway = createLovableAiGatewayProvider(key);
    const prompt = `You write polished Canadian business directory listings.

Business name: ${data.name}
Location: ${data.city}, ${data.province}
Owner pitch: ${data.pitch}

Return JSON with:
- description: 2-3 warm, specific paragraphs (no fake awards, no fabricated hours/phone).
- category_slug: pick the best fit from the allowed enum.
- tagline: a short 6-10 word tagline.
- keywords: 6-12 short lowercase search tags customers might type (one or two words, no punctuation).`;

    const models = ["google/gemini-2.5-flash", "google/gemini-2.5-flash-lite", "openai/gpt-5-mini"];
    let lastErr: unknown;
    for (const m of models) {
      try {
        const { object } = await generateObject({
          model: gateway(m),
          schema: DraftSchema,
          prompt,
        });
        return object;
      } catch (e) {
        lastErr = e;
        console.error(`[generateListingDraft] model ${m} failed:`, (e as Error)?.message);
      }
    }
    // Final fallback: return a usable draft so the owner can still publish.
    return {
      description: `${data.name} is a ${data.city}, ${data.province} business. ${data.pitch}`,
      category_slug: "professional-services" as const,
      tagline: data.name,
      keywords: [],
    };
  });

export const createListingWithAI = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    InputSchema.extend({
      description: z.string().min(10),
      category_slug: z.string(),
      website: z.string().url().optional().or(z.literal("")),
      phone: z.string().max(40).optional().or(z.literal("")),
      address: z.string().max(200).optional().or(z.literal("")),
      postal_code: z.string().trim().max(20).optional().or(z.literal("")),
      email: z.string().trim().email().max(255).optional().or(z.literal("")),
      keywords: z.array(z.string().min(1).max(40)).max(30).default([]),
      hero_image_url: z.string().url().max(500).optional().or(z.literal("")),
      gallery_paths: z.array(z.string().max(300)).max(8).optional().default([]),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: cat, error: catErr } = await supabase
      .from("categories")
      .select("id")
      .eq("slug", data.category_slug)
      .single();
    if (catErr || !cat) throw new Error("Category not found");

    const cleanedKeywords = Array.from(
      new Set(
        (data.keywords ?? [])
          .map((k) => k.toLowerCase().trim())
          .filter((k) => k.length >= 2 && k.length <= 40),
      ),
    );

    const galleryPaths = (data.gallery_paths ?? []).filter((p) => p.startsWith(`${context.userId}/`));

    const { data: row, error } = await supabase
      .from("businesses")
      .insert({
        name: data.name,
        slug: slugify(data.name),
        description: data.description,
        category_id: cat.id,
        owner_id: context.userId,
        city: data.city,
        province: data.province,
        website: data.website || null,
        phone: data.phone || null,
        address: data.address || null,
        postal_code: data.postal_code || null,
        email: data.email || null,
        keywords: cleanedKeywords,
        hero_image_url: data.hero_image_url || null,
        is_claimed: true,
        status: "pending",
      })
      .select("id, slug")
      .single();
    if (error) throw new Error(error.message);

    if (galleryPaths.length > 0) {
      const rows = galleryPaths.map((p, i) => ({
        business_id: row.id,
        storage_path: p,
        sort_order: i,
      }));
      await supabase.from("business_photos").insert(rows);
    }

    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: context.userId, role: "owner" }, { onConflict: "user_id,role" });

    return row;
  });
