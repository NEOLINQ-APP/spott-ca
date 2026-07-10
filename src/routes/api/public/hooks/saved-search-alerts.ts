// Public cron endpoint: iterates every saved search, finds marketplace
// listings created since the user's last alert that match query/city/category,
// dispatches one email per user per search, and stamps last_notified_at.
// Bypasses edge auth via /api/public/*; verifies CRON_SECRET before running.
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
  // Never email a user about their own listings.
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
      console.warn("[saved-search-alerts] failed for", s.id, (e as Error).message);
    }
  }

  return { checked, notified };
}

export const Route = createFileRoute("/api/public/hooks/saved-search-alerts")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey =
          request.headers.get("x-cron-secret") ??
          request.headers.get("apikey") ??
          request.headers.get("x-api-key");
        const expected = process.env.CRON_SECRET ?? "";
        if (!expected || !apiKey || apiKey !== expected) {
          return json({ error: "Unauthorized" }, 401);
        }
        try {
          const result = await runAlerts();
          return json({ ok: true, ...result });
        } catch (e) {
          console.error("saved-search-alerts failed", (e as Error).message);
          return json({ ok: false, error: (e as Error).message }, 500);
        }
      },
    },
  },
});
