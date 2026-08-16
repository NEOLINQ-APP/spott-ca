// Sparq image generation — Pro/Business subscribers only.
import { createFileRoute } from "@tanstack/react-router";
import { errorResponse, isResponse, jsonResponse, readJsonBody, requireBearerAuth } from "@/lib/api/http.server";

type Body = { prompt: string };

export const Route = createFileRoute("/api/sparq/image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireBearerAuth(request);
        if (isResponse(auth)) return auth;
        const body = await readJsonBody<Body>(request);
        if (isResponse(body)) return body;
        const prompt = (body.prompt ?? "").trim();
        if (!prompt) return errorResponse(400, "prompt required");
        if (prompt.length > 800) return errorResponse(400, "prompt too long");

        // Subscription gate
        const { data: isPaid } = await auth.supabase.rpc("has_active_subscription", {
          user_uuid: auth.userId,
          check_env: "live",
        });
        if (!isPaid) {
          return jsonResponse(
            {
              error: {
                code: "subscription_required",
                message: "Image generation is a Pro feature. Upgrade to Pro to generate images with Sparq.",
                upgrade_url: "/pricing",
              },
            },
            { status: 402 },
          );
        }

        const key = process.env.OPENAI_API_KEY;
        if (!key) return errorResponse(500, "AI not configured");

        // Runs on OpenAI (gpt-image-1) rather than Gemini — Gemini's image
        // models return "quota limit: 0" on the free tier until billing is
        // enabled on that Google Cloud project, a real account-level blocker
        // unrelated to code. OpenAI's key was already available and confirmed
        // working via a real test generation before wiring this in. Text
        // features (chat, listings, etc.) stay on Gemini, which has no such
        // billing gate and is already confirmed working — only image
        // generation needed a different provider.
        const styledPrompt = `${prompt}

Style guidance: clean, professional listing photography suitable for a Canadian marketplace/business directory. Realistic lighting, no watermarks, no overlaid text unless explicitly requested. Avoid depicting real identifiable people, brand logos, or copyrighted characters.`;

        try {
          const upstream = await fetch("https://api.openai.com/v1/images/generations", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-image-1",
              prompt: styledPrompt,
              size: "1024x1024",
              n: 1,
            }),
          });
          if (!upstream.ok) {
            const t = await upstream.text().catch(() => "");
            return errorResponse(upstream.status, `Image generation failed: ${t.slice(0, 200)}`);
          }
          const data = (await upstream.json()) as { data?: Array<{ b64_json?: string }> };
          const b64 = data.data?.[0]?.b64_json;
          if (!b64) return errorResponse(502, "No image returned");
          return jsonResponse({ image: `data:image/png;base64,${b64}` });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Image generation failed";
          return errorResponse(502, msg);
        }
      },
    },
  },
});
