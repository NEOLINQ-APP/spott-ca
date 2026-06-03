// Public drain endpoint — authenticates with the Supabase anon/publishable
// key in the `apikey` header. Processes a large batch of pending staged
// businesses, optionally filtered by category. Intended to be called
// repeatedly by an admin tool to burn down the ingest queue.
import { createFileRoute } from "@tanstack/react-router";
import { enrichBatch } from "@/lib/ingest/enrich-batch.server";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const Route = createFileRoute("/api/public/hooks/enrich-drain")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey =
          request.headers.get("apikey") ??
          request.headers.get("x-api-key") ??
          request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        const expected = process.env.CRON_SECRET ?? "";
        if (!expected || !apiKey || apiKey !== expected) {
          return json({ error: "Unauthorized" }, 401);
        }

        let body: { limit?: number; categorySlug?: string | null } = {};
        try {
          body = (await request.json()) as typeof body;
        } catch {
          // empty body is fine
        }

        try {
          const result = await enrichBatch({
            limit: body.limit ?? 50,
            categorySlug: body.categorySlug ?? null,
          });
          return json({ ok: true, ...result });
        } catch (e) {
          console.error("enrich-drain failed", (e as Error).message);
          return json({ ok: false, error: (e as Error).message }, 500);
        }
      },
    },
  },
});
