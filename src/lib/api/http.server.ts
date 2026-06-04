// Shared HTTP + auth helpers for /api/* server routes.
// SERVER-ONLY (.server.ts) — never import from client code.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY!;

export type AuthedContext = {
  userId: string;
  // Supabase client scoped to the calling user (RLS applies as that user).
  supabase: ReturnType<typeof createClient>;
};

const JSON_HEADERS = { "Content-Type": "application/json" };

export function jsonResponse(body: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: { ...JSON_HEADERS, ...(init.headers ?? {}) },
  });
}

export function errorResponse(status: number, message: string, details?: unknown): Response {
  return jsonResponse({ error: { message, details } }, { status });
}

/**
 * Validate the Authorization: Bearer <token> header against Supabase Auth.
 * Returns a user-scoped Supabase client + userId, or a 401 Response.
 */
export async function requireBearerAuth(request: Request): Promise<AuthedContext | Response> {
  const header = request.headers.get("authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return errorResponse(401, "Missing bearer token");

  const token = match[1];
  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return errorResponse(401, "Invalid or expired token");

  return { userId: data.user.id, supabase };
}

export async function readJsonBody<T = unknown>(request: Request): Promise<T | Response> {
  try {
    return (await request.json()) as T;
  } catch {
    return errorResponse(400, "Invalid JSON body");
  }
}

export function isResponse(value: unknown): value is Response {
  return value instanceof Response;
}
