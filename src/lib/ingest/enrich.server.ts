// Server-only: AI enrichment via Lovable AI Gateway.
import { generateObject } from "ai";
import { z } from "zod";
import { resolveAiModel } from "@/lib/ai-gateway";

const EnrichSchema = z.object({
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
  description: z.string().min(40).max(800),
  keywords: z.array(z.string()).max(12),
  confidence: z.number().min(0).max(1),
});

export type Enriched = z.infer<typeof EnrichSchema>;

export async function enrichBusiness(input: {
  name: string;
  address: string | null;
  city: string | null;
  province: string | null;
  phone: string | null;
  website: string | null;
  keywords: string[];
  category_hint: string;
}): Promise<Enriched> {
  const prompt = `You are enriching a Canadian business directory listing imported from OpenStreetMap.

Fields available:
- name: ${input.name}
- address: ${input.address ?? "(none)"}
- city: ${input.city ?? "(none)"}, ${input.province ?? "(none)"}
- phone: ${input.phone ?? "(none)"}
- website: ${input.website ?? "(none)"}
- raw tags/keywords: ${input.keywords.join(", ") || "(none)"}
- category hint from source: ${input.category_hint}

Return:
- category_slug: best fit from the allowed enum.
- description: 2-3 short sentences, factual only. Do NOT invent hours, awards, menu items, or phone numbers.
- keywords: 5-10 lowercase search tags customers might type.
- confidence: 0..1 — your confidence in the overall record quality (penalize missing address/phone/website).`;

  const models = ["google/gemini-3-flash-preview", "google/gemini-3.1-flash-lite"];
  let lastErr: unknown;
  for (const m of models) {
    try {
      const { object } = await generateObject({
        model: resolveAiModel(m),
        schema: EnrichSchema,
        prompt,
      });
      return object;
    } catch (e) {
      lastErr = e;
      console.error(`[enrich] ${m} failed:`, (e as Error)?.message);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("enrichBusiness failed");
}
