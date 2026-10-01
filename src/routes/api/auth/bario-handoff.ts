// GET /api/auth/bario-handoff?token=... -- the receiving end of the
// BARIO -> Spott login handoff (see BARIO's app/api/spott-handoff/route.ts).
// Verifies the short-lived signed token (proves a real, currently logged-in
// BARIO session vouched for this email a few seconds ago), finds or
// provisions a matching Spott/Supabase account by email, then redirects
// into Supabase's own magic-link verification endpoint so the browser
// lands back here already logged in -- same mechanism as clicking a real
// magic-link email, just without the email round-trip.
import { createFileRoute } from "@tanstack/react-router";
import { jwtVerify } from "jose";
import { errorResponse } from "@/lib/api/http.server";

const SITE_URL = "https://www.spott.ca";

function getSecret() {
  const secret = process.env.BARIO_SPOTT_HANDOFF_SECRET;
  if (!secret) throw new Error("BARIO_SPOTT_HANDOFF_SECRET is not set");
  return new TextEncoder().encode(secret);
}

export const Route = createFileRoute("/api/auth/bario-handoff")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token");
        if (!token) return errorResponse(400, "Missing token");

        let email: string;
        try {
          const { payload } = await jwtVerify(token, getSecret());
          if (typeof payload.email !== "string") throw new Error("no email in token");
          email = payload.email;
        } catch {
          return errorResponse(401, "Invalid or expired handoff token");
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        let { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: "magiclink",
          email,
          options: { redirectTo: `${SITE_URL}/dashboard` },
        });

        // No Spott account yet for this email -- create one (mirrors what
        // already happens on first Google sign-in) and try again.
        if (linkError) {
          const { error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            email_confirm: true,
          });
          if (createError) return errorResponse(500, `Could not provision account: ${createError.message}`);

          const retry = await supabaseAdmin.auth.admin.generateLink({
            type: "magiclink",
            email,
            options: { redirectTo: `${SITE_URL}/dashboard` },
          });
          linkData = retry.data;
          linkError = retry.error;
        }

        if (linkError || !linkData?.properties?.action_link) {
          return errorResponse(500, `Could not complete sign-in: ${linkError?.message ?? "no action link"}`);
        }

        return new Response(null, { status: 302, headers: { Location: linkData.properties.action_link } });
      },
    },
  },
});
