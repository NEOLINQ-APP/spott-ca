import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { generateText, Output } from "ai";
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
    const { output } = await generateText({
      model: gateway("google/gemini-3-flash-preview"),
      output: Output.object({ schema: DraftSchema }),
      prompt: `You write polished Canadian business directory listings.

Business name: ${data.name}
Location: ${data.city}, ${data.province}
Owner pitch: ${data.pitch}

Return:
- description: 2-3 warm, specific paragraphs (no fake awards, no fabricated hours/phone).
- category_slug: pick the best fit from the allowed enum.
- tagline: a short 6-10 word tagline.`,
    });
    return output;
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
        is_claimed: true,
        status: "pending",
      })
      .select("id, slug")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
