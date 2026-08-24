// TEMP one-time verification route: confirms the Resend swap actually
// delivers, by sending exactly 1 real claim-campaign invitation instead of
// the cron route's fixed batch of 20. Deleted after use.
import { createFileRoute } from "@tanstack/react-router";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const Route = createFileRoute("/api/public/test-claim-send")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("x-cron-secret") ?? request.headers.get("apikey") ?? request.headers.get("x-api-key");
        const expected = process.env.CRON_SECRET ?? "";
        if (!expected || !apiKey || apiKey !== expected) return json({ error: "Unauthorized" }, 401);

        const { runClaimCampaign } = await import("@/lib/claim-invitations.server");
        const result = await runClaimCampaign({ newInvitationLimit: 1, followUpLimit: 0 });
        return json({ ok: true, result });
      },
    },
  },
});
