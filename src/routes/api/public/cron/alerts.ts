// Public cron alias for saved-search alert dispatch.
// Delegates to the shared handler so both /api/public/cron/alerts and
// /api/public/hooks/saved-search-alerts trigger the same logic.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { notifySavedSearchMatches } from "@/lib/notifications.server";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

type Saved = {
  id: string;
  user_id: string;
  label: string;
  query: string | null;
  city: string | null;
  category_slug: string | null;
  last_notified_at: string | null;
  created_at: string;
};

async function findMatches(s: Saved) {
  const since = s.last_notified_at ?? s.created_at;
  let q = supabaseAdmin
    .from("marketplace_listings")
    .select("id,title,price_cents,city,category,created_at,user_id")
    .eq("status", "active")
    .gt("created_at", since)
    .order("created_at", { ascending: false })
    .limit(25);

  if (s.query) q = q.ilike("title", `%${s.query}%`);
  if (s.city) q = q.ilike("city", `%${s.city}%`);
  if (s.category_slug) q = q.ilike("category", `%${s.category_slug}%`);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []).filter((r: any) => r.user_id !== s.user_id);
}

async function runAlerts() {
  const { data: searches, error } = await supabaseAdmin
    .from("saved_searches")
    .select("id,user_id,label,query,city,category_slug,last_notified_at,created_at")
    .limit(1000);
  if (error) throw error;

  let notified = 0;
  let checked = 0;

  for (const s of (searches ?? []) as Saved[]) {
    checked += 1;
    try {
      const matches = await findMatches(s);
      if (matches.length === 0) continue;

      const { data: userInfo } = await supabaseAdmin.auth.admin.getUserById(s.user_id);
      const email = userInfo?.user?.email;
      if (email) {
        await notifySavedSearchMatches(email, s.label, matches as any);
        notified += 1;
      }
      await supabaseAdmin
        .from("saved_searches")
        .update({ last_notified_at: new Date().toISOString() })
        .eq("id", s.id);
    } catch (e) {
      console.warn("[cron/alerts] failed for", s.id, (e as Error).message);
    }
  }

  return { checked, notified };
}

export const Route = createFileRoute("/api/public/cron/alerts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey =
          request.headers.get("apikey") ??
          request.headers.get("x-cron-secret") ??
          request.headers.get("x-api-key");
        const expected = process.env.CRON_SECRET ?? "";
        // Also allow the anon publishable key used by pg_cron schedules.
        const anon = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
        if (!apiKey || (apiKey !== expected && apiKey !== anon)) {
          return json({ error: "Unauthorized" }, 401);
        }
        try {
          const result = await runAlerts();
          return json({ ok: true, ...result });
        } catch (e) {
          console.error("cron/alerts failed", (e as Error).message);
          return json({ ok: false, error: (e as Error).message }, 500);
        }
      },
    },
  },
});
