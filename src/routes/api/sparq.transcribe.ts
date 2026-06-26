import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/sparq/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Sparq voice not configured", { status: 500 });

        const inForm = await request.formData().catch(() => null);
        const file = inForm?.get("file");
        if (!(file instanceof File) || file.size === 0) {
          return new Response("Missing audio file", { status: 400 });
        }
        if (file.size > 20 * 1024 * 1024) {
          return new Response("Audio too large", { status: 413 });
        }

        const mime = (file.type || "audio/webm").split(";")[0];
        const ext =
          mime === "audio/mp4" ? "mp4"
          : mime === "audio/mpeg" ? "mp3"
          : mime === "audio/wav" || mime === "audio/wave" ? "wav"
          : mime === "audio/ogg" ? "ogg"
          : "webm";

        const upstream = new FormData();
        upstream.append("model", "openai/gpt-4o-mini-transcribe");
        upstream.append("file", file, `recording.${ext}`);

        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { Authorization: `Bearer ${key}` },
          body: upstream,
        });

        if (!res.ok) {
          const msg = await res.text().catch(() => "");
          return new Response(msg || "Transcription failed", { status: res.status });
        }
        const data = await res.json();
        return Response.json({ text: data.text ?? "" });
      },
    },
  },
});
