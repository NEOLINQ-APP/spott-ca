// REST: /api/auth/session
// GET → returns current session user (validated against Supabase Auth)
// Sign-in/sign-up/sign-out happen via the Supabase client SDK in the browser
// (token persistence + OAuth handshake) — this endpoint reports server-side
// session state for any caller (web, mobile, future VPS clients).
import { createFileRoute } from "@tanstack/react-router";
import { isResponse, jsonResponse, requireBearerAuth } from "@/lib/api/http.server";

export const Route = createFileRoute("/api/auth/session")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireBearerAuth(request);
        if (isResponse(auth)) return auth;

        const { data } = await auth.supabase.auth.getUser();
        return jsonResponse({
          authenticated: true,
          user: data.user
            ? { id: data.user.id, email: data.user.email, created_at: data.user.created_at }
            : null,
        });
      },
    },
  },
});
