// Google's own redirect back after the business owner authorizes access --
// a plain browser navigation, no custom headers, so this can't go through
// requireSupabaseAuth. Trust boundary is the HMAC-signed `state` instead
// (see googleAdsOAuth.server.ts) -- verifying it recovers the real
// business_id without needing to see the caller's session at all.
import { createFileRoute } from "@tanstack/react-router";
import { exchangeAdsCodeForTokens, verifyBusinessState } from "@/lib/googleAdsOAuth.server";

function redirectTo(url: string) {
  return new Response(null, { status: 302, headers: { Location: url } });
}

export const Route = createFileRoute("/api/public/google-ads/oauth/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        const origin = `${url.protocol}//${url.host}`;

        const businessId = state ? verifyBusinessState(state) : null;
        if (!code || !businessId) {
          return redirectTo(`${origin}/?google_ads_error=${encodeURIComponent("Connection link expired or was tampered with")}`);
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: biz } = await supabaseAdmin
          .from("businesses")
          .select("slug, owner_id")
          .eq("id", businessId)
          .maybeSingle();
        const backTo = biz?.slug ? `${origin}/business/${biz.slug}` : origin;
        if (!biz?.owner_id) {
          return redirectTo(`${backTo}?google_ads_error=${encodeURIComponent("Business not found")}`);
        }

        try {
          const tokens = await exchangeAdsCodeForTokens(code, origin);
          if (!tokens.refresh_token) {
            return redirectTo(`${backTo}?google_ads_error=${encodeURIComponent("Google did not return a refresh token -- revoke prior access at myaccount.google.com/permissions and try again")}`);
          }

          await (supabaseAdmin as any).from("google_ads_connections").upsert({
            business_id: businessId,
            refresh_token: tokens.refresh_token,
            connected_by_user_id: biz.owner_id,
            updated_at: new Date().toISOString(),
          });

          return redirectTo(`${backTo}?google_ads_connected=1`);
        } catch (err) {
          console.error("Google Ads OAuth callback failed", err);
          return redirectTo(`${backTo}?google_ads_error=${encodeURIComponent("Could not complete the Google Ads connection")}`);
        }
      },
    },
  },
});
