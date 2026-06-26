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
        const text = (body.text ?? "").toString().slice(0, 4000).trim();
        if (!text) return new Response("Missing text", { status: 400 });

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
