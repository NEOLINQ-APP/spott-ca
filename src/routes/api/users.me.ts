// REST: /api/users/me
// GET   → current user profile + roles
// PATCH → update own profile (display_name, avatar_url)
import { createFileRoute } from "@tanstack/react-router";
import {
  errorResponse,
  isResponse,
  jsonResponse,
  readJsonBody,
  requireBearerAuth,
} from "@/lib/api/http.server";

export const Route = createFileRoute("/api/users/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const auth = await requireBearerAuth(request);
        if (isResponse(auth)) return auth;

        const [{ data: profile }, { data: roles }] = await Promise.all([
          auth.supabase.from("profiles").select("*").eq("id", auth.userId).maybeSingle(),
          auth.supabase.from("user_roles").select("role").eq("user_id", auth.userId),
        ]);

        return jsonResponse({
          user_id: auth.userId,
          profile,
          roles: (roles ?? []).map((r) => r.role),
        });
      },

      PATCH: async ({ request }) => {
        const auth = await requireBearerAuth(request);
        if (isResponse(auth)) return auth;
        const body = await readJsonBody<{ display_name?: string; avatar_url?: string }>(request);
        if (isResponse(body)) return body;

        const patch: Record<string, unknown> = {};
        if (typeof body.display_name === "string") patch.display_name = body.display_name;
        if (typeof body.avatar_url === "string") patch.avatar_url = body.avatar_url;

        const { data, error } = await auth.supabase
          .from("profiles")
          .update(patch)
          .eq("id", auth.userId)
          .select()
          .maybeSingle();
        if (error) return errorResponse(400, error.message);
        return jsonResponse({ data });
      },
    },
  },
});
