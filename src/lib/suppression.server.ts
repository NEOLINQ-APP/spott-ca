// Wakes up suppressed_emails/email_unsubscribe_tokens — real tables that
// existed in the schema (email_infra.sql) but had zero code touching
// them anywhere in the app before this. Not a new suppression mechanism;
// this is what makes the existing one actually function.
import { randomBytes } from "node:crypto";

export type SuppressionReason = "unsubscribe" | "bounce" | "complaint";

export async function isSuppressed(email: string): Promise<boolean> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("suppressed_emails")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .maybeSingle();
  return !!data;
}

export async function suppress(email: string, reason: SuppressionReason, metadata?: Record<string, unknown>): Promise<void> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  await supabaseAdmin
    .from("suppressed_emails")
    .upsert({ email: email.toLowerCase().trim(), reason, metadata: metadata ?? null } as never, { onConflict: "email" });
}

// Returns the existing token for this email if one exists (stable link
// across multiple campaign emails), otherwise mints a new one.
export async function getOrCreateUnsubscribeToken(email: string): Promise<string> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const normalized = email.toLowerCase().trim();
  const { data: existing } = await supabaseAdmin
    .from("email_unsubscribe_tokens")
    .select("token")
    .eq("email", normalized)
    .is("used_at", null)
    .maybeSingle();
  if (existing) return existing.token;

  const token = randomBytes(24).toString("hex");
  const { error } = await supabaseAdmin
    .from("email_unsubscribe_tokens")
    .upsert({ email: normalized, token } as never, { onConflict: "email" });
  if (error) throw new Error(error.message);
  return token;
}

export async function unsubscribeByToken(token: string): Promise<{ ok: boolean; email?: string }> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row } = await supabaseAdmin
    .from("email_unsubscribe_tokens")
    .select("email, used_at")
    .eq("token", token)
    .maybeSingle();
  if (!row) return { ok: false };

  await supabaseAdmin.from("email_unsubscribe_tokens").update({ used_at: new Date().toISOString() }).eq("token", token);
  await suppress(row.email, "unsubscribe", { via: "unsubscribe_link" });
  return { ok: true, email: row.email };
}
