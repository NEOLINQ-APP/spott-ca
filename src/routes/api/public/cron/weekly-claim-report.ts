// Same x-cron-secret convention as claim-campaign.ts/ingest-tick.ts. Emails
// the user a weekly summary of the claim-listing campaign (sent/opened/
// claimed/bounced counts for the past 7 days) rather than daily, matching
// the explicit "don't spam, don't need a report every morning" shape
// already agreed for this campaign.
import { createFileRoute } from "@tanstack/react-router";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const REPORT_TO_EMAIL = process.env.CLAIM_CAMPAIGN_REPORT_EMAIL || "uniquegroup.org@gmail.com";

export const Route = createFileRoute("/api/public/cron/weekly-claim-report")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = request.headers.get("x-cron-secret") ?? request.headers.get("apikey") ?? request.headers.get("x-api-key");
        const expected = process.env.CRON_SECRET ?? "";
        if (!expected || !apiKey || apiKey !== expected) return json({ error: "Unauthorized" }, 401);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { sendEmail } = await import("@/lib/notifications.server");

        const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

        const [touchesSent, opened, claimed, bounced, totalInvitations, totalClaimed] = await Promise.all([
          supabaseAdmin.from("claim_invitation_log").select("*", { count: "exact", head: true }).gte("sent_at", since),
          supabaseAdmin.from("claim_invitations").select("*", { count: "exact", head: true }).gte("opened_at", since),
          supabaseAdmin.from("claim_invitations").select("*", { count: "exact", head: true }).gte("claimed_at", since),
          supabaseAdmin.from("suppressed_emails").select("*", { count: "exact", head: true }).gte("created_at", since),
          supabaseAdmin.from("claim_invitations").select("*", { count: "exact", head: true }),
          supabaseAdmin.from("businesses").select("*", { count: "exact", head: true }).eq("is_claimed", true),
        ]);

        const counts = {
          touchesSentThisWeek: touchesSent.count ?? 0,
          openedThisWeek: opened.count ?? 0,
          claimedThisWeek: claimed.count ?? 0,
          bouncedOrComplainedThisWeek: bounced.count ?? 0,
          totalInvitationsAllTime: totalInvitations.count ?? 0,
          totalClaimedAllTime: totalClaimed.count ?? 0,
        };

        const html = `
          <div style="font-family:sans-serif;max-width:520px;margin:0 auto;">
            <h2 style="color:#051d53;">Spott.ca claim campaign — weekly report</h2>
            <p style="color:#4a4a4a;">Past 7 days:</p>
            <ul>
              <li><strong>${counts.touchesSentThisWeek}</strong> emails sent</li>
              <li><strong>${counts.openedThisWeek}</strong> opened</li>
              <li><strong>${counts.claimedThisWeek}</strong> listings claimed</li>
              <li><strong>${counts.bouncedOrComplainedThisWeek}</strong> bounced/complained</li>
            </ul>
            <p style="color:#4a4a4a;">All-time: <strong>${counts.totalInvitationsAllTime}</strong> invitations sent, <strong>${counts.totalClaimedAllTime}</strong> businesses claimed.</p>
          </div>
        `;

        const result = await sendEmail({
          to: REPORT_TO_EMAIL,
          subject: `Spott.ca claim campaign — ${counts.claimedThisWeek} claimed this week`,
          html,
        });

        return json({ ok: true, counts, emailed: result.ok });
      },
    },
  },
});
