// SPOTT Auto referral link: /r/:code. Server-only redirect endpoint (no
// React component — there's nothing to render, this always redirects) that
// validates the partner code, records a referral_click tracking event, and
// sets a short-lived httpOnly cookie so attachSpottAutoReferral can attribute
// the signup once the visitor actually creates an account. Invalid/inactive
// codes redirect straight through with no cookie set, rather than erroring —
// a bad or stale referral link should still be a normal working link.
import { createFileRoute } from "@tanstack/react-router";

const REFERRAL_COOKIE = "spott_auto_ref";
const COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days, matches spott_auto_referrals.expires_at

// Only ever redirect somewhere inside spott.ca — an open ?to= would make
// this endpoint an open-redirect vector.
function resolveRedirectPath(rawTo: string | null): string {
  if (!rawTo) return "/vehicles";
  if (!rawTo.startsWith("/") || rawTo.startsWith("//")) return "/vehicles";
  return rawTo;
}

export const Route = createFileRoute("/r/$code")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const code = params.code?.trim();
        const url = new URL(request.url);
        const redirectPath = resolveRedirectPath(url.searchParams.get("to"));

        if (!code) {
          return new Response(null, { status: 302, headers: { Location: redirectPath } });
        }

        try {
          const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
          const { data: partner } = await supabaseAdmin
            .from("spott_auto_partners")
            .select("id, status")
            .eq("referral_code", code)
            .maybeSingle();

          const headers = new Headers({ Location: redirectPath });

          if (partner && partner.status === "active") {
            const isQr = url.searchParams.get("src") === "qr";
            await supabaseAdmin.from("spott_auto_tracking_events").insert({
              event_type: isQr ? "qr_scan" : "referral_click",
              partner_id: partner.id,
              referral_code: code,
              resource_id: null,
              metadata: { to: redirectPath },
            });

            const cookieValue = encodeURIComponent(code);
            headers.append(
              "Set-Cookie",
              `${REFERRAL_COOKIE}=${cookieValue}; Max-Age=${COOKIE_MAX_AGE_SECONDS}; Path=/; HttpOnly; Secure; SameSite=Lax`,
            );
          }

          return new Response(null, { status: 302, headers });
        } catch (e) {
          console.error("referral click handling failed", e);
          return new Response(null, { status: 302, headers: { Location: redirectPath } });
        }
      },
    },
  },
});
