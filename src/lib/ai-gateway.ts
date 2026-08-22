import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// Model IDs throughout this codebase use Lovable's own naming convention
// (e.g. "google/gemini-3-flash-preview") because they used to route through
// Lovable's AI Gateway, which transparently proxied to whichever real
// provider the prefix named. That gateway is gated on LOVABLE_API_KEY — a
// credential Lovable auto-injects only inside its own hosting runtime and
// never exposes as a copyable value (same dead end already hit and fixed
// for email/OAuth/Stripe/geocoding).
//
// 2026-08-21: switched from Gemini to OpenAI's gpt-5.6-luna (real, explicit
// user request — Luna is the cheapest of the models actually in use across
// Bario's stack, and none of Sparq/Zeus's features use tool-calling, so the
// reasoning_effort:'none' requirement that matters elsewhere for Luna+tools
// doesn't apply here). Every prefixedModelId now resolves to Luna
// regardless of its "google/..." naming — the call sites were never
// updated since the naming is just a historical label, not a live routing
// decision read anywhere else. Falls back to Gemini only if OPENAI_API_KEY
// isn't configured, so this fails soft rather than breaking every AI
// feature on the site if that env var is ever missing.
//
// Uses createOpenAICompatible (same helper the Gemini provider below
// already uses) pointed at OpenAI's real API rather than the official
// @ai-sdk/openai package — that package is pinned to an older
// LanguageModelV4 spec than this project's `ai`@6 core expects
// (LanguageModelV2/V3), a real type error confirmed via `tsc`. OpenAI's API
// is the reference implementation of "OpenAI-compatible," so this works
// identically without the version mismatch.
function openaiProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "openai",
    baseURL: "https://api.openai.com/v1",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

function geminiProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

const OPENAI_MODEL = "gpt-5.6-luna";
const GEMINI_FALLBACK_MODEL = "gemini-3-flash-preview";

export function resolveAiModel(_prefixedModelId: string) {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey) return openaiProvider(openaiKey)(OPENAI_MODEL);

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) throw new Error("Neither OPENAI_API_KEY nor GEMINI_API_KEY is configured");
  return geminiProvider(geminiKey)(GEMINI_FALLBACK_MODEL);
}
