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

        const key = process.env.GEMINI_API_KEY;
        if (!key) return errorResponse(500, "AI not configured");

        // Gemini's image endpoint has no system role, so brand guidance rides
        // along with the user prompt to keep listing photos on-brand and safe.
        const styledPrompt = `${prompt}

Style guidance: clean, professional listing photography suitable for a Canadian marketplace/business directory. Realistic lighting, no watermarks, no overlaid text unless explicitly requested. Avoid depicting real identifiable people, brand logos, or copyrighted characters.`;

        try {
          // Calls Google's real Gemini API directly (its own OpenAI-compatible
          // endpoint) instead of the now-dead Lovable AI Gateway proxy — same
          // request shape, since that shape was always Gemini's own, just
          // reached through Lovable's URL before.
          const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/images/generations", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${key}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-image",
              messages: [{ role: "user", content: styledPrompt }],
              modalities: ["image", "text"],
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
