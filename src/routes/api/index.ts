// REST: /api  → API index / discovery document
import { createFileRoute } from "@tanstack/react-router";
import { jsonResponse } from "@/lib/api/http.server";

export const Route = createFileRoute("/api/")({
  server: {
    handlers: {
      GET: async () => jsonResponse({
        name: "Spott API",
        version: "1.0.0",
        endpoints: {
          listings: { list: "GET /api/listings", create: "POST /api/listings", item: "/api/listings/:id (GET, PATCH, DELETE)" },
          vehicles: { list: "GET /api/vehicles", create: "POST /api/vehicles", item: "/api/vehicles/:id (GET, PATCH, DELETE)" },
          users: { me: "/api/users/me (GET, PATCH)" },
          auth: { session: "GET /api/auth/session" },
          subscriptions: { mine: "GET /api/subscriptions", plans: "GET /api/subscriptions/plans" },
        },
        auth: "Bearer token in Authorization header (Supabase JWT)",
      }),
    },
  },
});
