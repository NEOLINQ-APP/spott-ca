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
  // No length/range constraints (.min/.max) on any field below --
  // Anthropic's structured-output schema mode rejects them outright
  // (confirmed live 2026-08-27: rejected maxItems on the keywords array,
  // then minimum/maximum on confidence). The prompt's own instructions
  // carry these bounds instead; enrichPendingBatch/ingest-tick already
  // clamp confidence into [0,1] and truncate keywords downstream.
  description: z.string(),
  keywords: z.array(z.string()),
  confidence: z.number(),
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
- category_slug: the single best fit, copied EXACTLY as one of these values
  (do not invent variants like "shopping-centers" — pick from this list only):
  restaurants-food, beauty-personal-care, health-wellness, home-services,
  automotive, professional-services, shopping-retail, events-entertainment.
- description: 2-3 short sentences, factual only. Do NOT invent hours, awards, menu items, or phone numbers.
- keywords: 5-10 lowercase search tags customers might type.
- confidence: 0..1 — your confidence in the overall record quality (penalize missing address/phone/website).`;

  // 2026-08-28's choice (Claude-only) silently stalled this whole pipeline
  // for over a week: confirmed live via production logs 2026-09-06 that
  // ANTHROPIC_API_KEY has been out of billing credits since ~Sept 1, and
  // the Gemini-only fallback was in turn getting rate-limited (429s) from
  // carrying 100% of every enrichment call solo. OpenAI (gpt-5.6-luna) is
  // the one path already proven working everywhere else on this site right
  // now (Sparq/Zeus), so it goes first; Anthropic/Gemini stay as real
  // fallbacks rather than being removed, in case credits get topped up or
  // Gemini's rate limit clears.
  const attempts: Array<{ label: string; forceProvider?: "gemini" | "openai" | "anthropic" }> = [
    { label: "primary-openai", forceProvider: "openai" },
    { label: "anthropic-fallback", forceProvider: "anthropic" },
    { label: "gemini-fallback", forceProvider: "gemini" },
  ];
  let lastErr: unknown;
  for (const attempt of attempts) {
    try {
      const { object } = await generateObject({
        model: resolveAiModel("google/gemini-3.1-flash-lite", attempt.forceProvider),
        schema: EnrichSchema,
        prompt,
      });
      return object;
    } catch (e) {
      lastErr = e;
      console.error(`[enrich] ${attempt.label} failed:`, (e as Error)?.message);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("enrichBusiness failed");
}
