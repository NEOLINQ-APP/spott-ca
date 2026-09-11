// Daily full backup of every real table in the public schema, run on a
// schedule (see vercel.json's `crons`). Built 2026-09-11 after finding
// spott.ca's Supabase org is on the free plan, which ships with zero
// automatic backups at all — see src/lib/db-backup.server.ts for the
// real logic and why this is a logical JSON export, not a pg_dump.
import { createFileRoute } from "@tanstack/react-router";

export const maxDuration = 300;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

export const Route = createFileRoute("/api/public/cron/db-backup")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        // Same auth shape as storage-healthcheck.ts — Vercel's own Cron
        // Jobs send `Authorization: Bearer $CRON_SECRET` automatically.
        const auth = request.headers.get("authorization");
        const apiKey =
          request.headers.get("apikey") ??
          request.headers.get("x-cron-secret") ??
          request.headers.get("x-api-key") ??
          (auth?.startsWith("Bearer ") ? auth.slice(7) : null);
        const expected = process.env.CRON_SECRET ?? "";
        if (!expected || !apiKey || apiKey !== expected) {
          return json({ error: "Unauthorized" }, 401);
        }

        const { runFullBackup } = await import("@/lib/db-backup.server");
        const result = await runFullBackup();

        if (!result.ok) {
          try {
            const { sendEmail } = await import("@/lib/notifications.server");
            await sendEmail({
              to: "uniquegroup.org@gmail.com",
              subject: "⚠️ Spott.ca daily database backup FAILED",
              html: `<p>Today's scheduled database backup did not complete.</p><p>Error: <code>${result.error}</code></p><p>Spott.ca's Supabase project is on the free plan (no automatic backups of its own) — this cron is the only backup currently in place. Check this before assuming client listing/business data is protected.</p>`,
            });
          } catch (e) {
            console.error("db-backup: failed to send alert email", (e as Error).message);
          }
          console.error("db-backup FAILED:", result.error);
          return json({ ok: false, error: result.error }, 500);
        }

        return json(result);
      },
    },
  },
});
