// Public cron: run 3-part Founding Member welcome sequence.
// Schedule via pg_cron, e.g. every hour.
import { createFileRoute } from "@tanstack/react-router";
import { runWelcomeSequence } from "@/lib/welcome-sequence.server";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const Route = createFileRoute("/api/public/cron/welcome-sequence")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey =
          request.headers.get("apikey") ??
          request.headers.get("x-cron-secret") ??
          request.headers.get("x-api-key");
        const expected = process.env.CRON_SECRET ?? "";
        if (!expected || !apiKey || apiKey !== expected) {
          return json({ error: "Unauthorized" }, 401);
        }
        try {
          const result = await runWelcomeSequence(300);
          return json({ ok: true, ...result });
        } catch (e) {
          console.error("cron/welcome-sequence failed", (e as Error).message);
          return json({ ok: false, error: (e as Error).message }, 500);
        }
      },
    },
  },
});
