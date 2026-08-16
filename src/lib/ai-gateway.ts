import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// Model IDs throughout this codebase use Lovable's own naming convention
// (e.g. "google/gemini-3-flash-preview", historically also "openai/gpt-5-mini"
// as a last-resort fallback) because they used to route through Lovable's AI
// Gateway, which transparently proxied to whichever real provider the
// prefix named. That gateway is gated on LOVABLE_API_KEY — a credential
// Lovable auto-injects only inside its own hosting runtime and never
// exposes as a copyable value (same dead end already hit and fixed for
// email/OAuth/Stripe/geocoding). Now that this app runs on Netlify, every
// prefix resolves against Gemini directly instead — the provider these
// features were actually designed and prompt-tuned around, using a real key
// that already exists and is already paying for Bario's own AI features.
// (A stray "openai/" fallback ID just gets treated as another Gemini call
// rather than needing a second real provider wired in for one rarely-hit
// last-resort case.)
function geminiProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

const FALLBACK_MODEL = "gemini-3-flash-preview";

export function resolveAiModel(prefixedModelId: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");

  const slash = prefixedModelId.indexOf("/");
  const prefix = slash === -1 ? "" : prefixedModelId.slice(0, slash);
  const modelName = slash === -1 ? prefixedModelId : prefixedModelId.slice(slash + 1);

  const resolvedName = prefix === "google" ? modelName : FALLBACK_MODEL;
  return geminiProvider(key)(resolvedName);
}
