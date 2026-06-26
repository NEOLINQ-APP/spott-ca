import { createFileRoute } from "@tanstack/react-router";

// Public widget config endpoint — returns only branding/greeting fields.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Cache-Control": "public, max-age=60",
};

export const Route = createFileRoute("/api/public/sparq/config/$slug")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const url = process.env.SUPABASE_URL;
        const key = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!url || !key) return new Response("Not configured", { status: 500, headers: CORS });
        const res = await fetch(`${url}/rest/v1/rpc/get_sparq_widget_config`, {
          method: "POST",
          headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
          body: JSON.stringify({ _slug: params.slug }),
        });
        if (!res.ok) return new Response("Lookup failed", { status: 500, headers: CORS });
        const arr = await res.json();
        const cfg = Array.isArray(arr) ? arr[0] : null;
        if (!cfg) return new Response("Not found", { status: 404, headers: CORS });
        return Response.json(
          {
            assistant_name: cfg.assistant_name,
            brand_color: cfg.brand_color,
            greeting: cfg.greeting,
            business_name: cfg.business_name,
          },
          { headers: CORS },
        );
      },
    },
  },
});
