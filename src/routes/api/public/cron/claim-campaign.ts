// Same x-cron-secret convention as ingest-tick.ts/saved-search-alerts.ts.
import { createFileRoute } from "@tanstack/react-router";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const Route = createFileRoute("/api/public/cron/claim-campaign")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("x-cron-secret") ?? request.headers.get("apikey") ?? request.headers.get("x-api-key");
        const expected = process.env.CRON_SECRET ?? "";
        if (!expected || !apiKey || apiKey !== expected) return json({ error: "Unauthorized" }, 401);

        const { runClaimCampaign } = await import("@/lib/claim-invitations.server");
        const result = await runClaimCampaign();
        return json({ ok: true, result });
      },
    },
  },
});
