// Server-only helper for loading Sparq settings inside chat endpoints.
// Uses service-role client; safe because admin gating happens at the UI layer.
import type { SparqSettings } from "./sparq-settings.functions";

const DEFAULTS: SparqSettings = {
  id: "global",
  enabled: true,
  model: "google/gemini-3-flash-preview",
  temperature: 0.7,
  system_prompt_override: null,
  additional_instructions: null,
  offtopic_redirect:
    "I'm built to help you with Spott.ca and the businesses on it — want me to help you find a business, listing, or deal?",
  // "Spot Dot See Ay" trained brand profile — nova is our warm on-brand voice.
  voice_default: "nova",
  voice_speed: 1.0,
  business_strict_mode: true,
  business_additional_rules: null,
  updated_at: new Date(0).toISOString(),
};

let cache: { at: number; value: SparqSettings } | null = null;
const TTL_MS = 30_000;

export async function loadSparqSettings(): Promise<SparqSettings> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("sparq_settings")
      .select("*")
      .eq("id", "global")
      .maybeSingle();
    const value = (data as unknown as SparqSettings) ?? DEFAULTS;
    cache = { at: Date.now(), value };
    return value;
  } catch {
    return DEFAULTS;
  }
}

export function invalidateSparqSettingsCache() {
  cache = null;
}
