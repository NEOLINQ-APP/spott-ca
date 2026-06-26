import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/sparq/speak")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Sparq voice not configured", { status: 500 });

        let body: { text?: string; voice?: string };
        try {
          body = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }
        const raw = (body.text ?? "").toString().slice(0, 4000).trim();
        if (!raw) return new Response("Missing text", { status: 400 });
        // Pronunciation fixes for TTS: "Spott.ca" -> "Spott - Dot - See Ay"
        const text = raw
          .replace(/\bSpott\.ca\b/gi, "Spott - Dot - See Ay")
          .replace(/\bspott\s*dot\s*dot\s*(ka|ca)\b/gi, "Spott - Dot - See Ay")
          .replace(/\bspott\s*dot\s*(ka|ca|see ay)\b/gi, "Spott - Dot - See Ay")
          .replace(/\bSpott\b(?!\s*(dot|\.|-))/g, "Spott");

        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini-tts",
            input: text,
            voice: body.voice ?? "alloy",
            response_format: "mp3",
            speed: 1.25,
          }),
        });

        if (!res.ok) {
          const msg = await res.text().catch(() => "");
          return new Response(msg || "Speech failed", { status: res.status });
        }
        return new Response(res.body, {
          headers: {
            "Content-Type": "audio/mpeg",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
