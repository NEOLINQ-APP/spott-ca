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
    // Without this, the AI SDK's generateObject falls back to the legacy
    // `response_format: {type:"json_object"}` mode, which OpenAI's real API
    // rejects unless the literal word "json" appears somewhere in the
    // prompt -- confirmed live 2026-09-06 ("'messages' must contain the
    // word 'json'...") breaking src/lib/ingest/enrich.server.ts's call,
    // which never mentions JSON by name. True here makes generateObject use
    // OpenAI's real json_schema structured-outputs mode instead (which
    // gpt-5.6-luna supports), the same fix anthropicProvider below already
    // needed for its own strict OpenAI-compat layer.
    supportsStructuredOutputs: true,
  });
}

function geminiProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "gemini",
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
}

// Anthropic ships a real OpenAI-compatible chat/completions endpoint
// (confirmed live 2026-08-27), so this reuses the same createOpenAICompatible
// helper as OpenAI/Gemini above rather than pulling in @ai-sdk/anthropic.
function anthropicProvider(apiKey: string) {
  return createOpenAICompatible({
    name: "anthropic",
    baseURL: "https://api.anthropic.com/v1",
    headers: { Authorization: `Bearer ${apiKey}`, "anthropic-version": "2023-06-01" },
    // Anthropic's OpenAI-compat layer is strict: it only accepts the full
    // json_schema response_format, not the generic json_object fallback the
    // SDK uses when this is off. Explicit true confirmed necessary live
    // 2026-08-27 (`supportsStructuredOutputs: false` made the same error
    // worse, not better).
    supportsStructuredOutputs: true,
  });
}

const OPENAI_MODEL = "gpt-5.6-luna";
const GEMINI_FALLBACK_MODEL = "gemini-3-flash-preview";
const ANTHROPIC_MODEL = "claude-haiku-4-5";

// 2026-08-27: OpenAI billing resolved -- switched back to OpenAI/Luna first
// (matching Victoria's voice line), Anthropic second as a real fallback
// (kept working from the earlier stopgap, not removed), Gemini last as the
// free-tier fallback. openaiModelOverride lets one call site (currently just
// bulk ingest enrichment) use a faster OpenAI model than the site-wide
// default without changing Sparq/Zeus's model.
export function resolveAiModel(
  _prefixedModelId: string,
  forceProvider?: "gemini" | "openai" | "anthropic",
  openaiModelOverride?: string,
) {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (openaiKey && forceProvider !== "gemini" && forceProvider !== "anthropic") {
    return openaiProvider(openaiKey)(openaiModelOverride ?? OPENAI_MODEL);
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey && forceProvider !== "gemini") return anthropicProvider(anthropicKey)(ANTHROPIC_MODEL);

  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) throw new Error("None of OPENAI_API_KEY, ANTHROPIC_API_KEY, or GEMINI_API_KEY is configured");
  return geminiProvider(geminiKey)(GEMINI_FALLBACK_MODEL);
}
