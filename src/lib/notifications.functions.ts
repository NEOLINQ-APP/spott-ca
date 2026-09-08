import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Fire welcome email for the currently signed-in user — genuinely
 * idempotent, not just best-effort. The caller's own localStorage guard
 * only protects against re-firing in the SAME browser; a new device,
 * browser, or incognito window had no record of a prior send and fired
 * again (confirmed live 2026-08-29: 13 duplicate sends to one real address
 * within an hour). This atomically claims the "first send" via a
 * conditional UPDATE — only the caller that actually flips
 * welcome_email_sent_at from null sends the real email.
 */
export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    const email = (claims as any)?.email;
    if (!email) return { ok: false, reason: "no_email" };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: claimed } = await supabaseAdmin
      .from("profiles")
      .update({ welcome_email_sent_at: new Date().toISOString() })
      .eq("id", userId)
      .is("welcome_email_sent_at", null)
      .select("display_name")
      .maybeSingle();
    if (!claimed) return { ok: false, reason: "already_sent" };

    const { notifyWelcome } = await import("./notifications.server");
    return notifyWelcome(email, claimed.display_name ?? undefined);
  });

/** Notify the other party in a marketplace thread that a new message arrived. */
export const notifyMarketplaceMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ thread_id: z.string().uuid(), snippet: z.string().max(500) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: t } = await supabase
      .from("mp_threads")
      .select("id, seller_id, buyer_id, listing_id")
      .eq("id", data.thread_id)
      .maybeSingle();
    if (!t) return { ok: false, reason: "no_thread" };
    if (t.seller_id !== userId && t.buyer_id !== userId) return { ok: false, reason: "not_participant" };
    const recipientId = t.seller_id === userId ? t.buyer_id : t.seller_id;

    const { data: sender } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();
    const { data: recipient } = await supabaseAdmin.auth.admin.getUserById(recipientId);
    const email = recipient?.user?.email;
    if (!email) return { ok: false, reason: "no_recipient_email" };

    const { notifyNewMessage } = await import("./notifications.server");
    return notifyNewMessage(
      email,
      sender?.display_name || "A buyer",
      data.snippet,
      "https://spott.ca/dashboard",
    );
  });

/**
 * Notify the other party in a business (dm_threads) conversation that a new
 * message arrived. Business owners previously got no notification at all
 * when a customer messaged them — messages just sat in dm_messages with no
 * signal, unlike marketplace threads which already email via
 * notifyMarketplaceMessage above. Mirrors that function's shape exactly.
 */
export const notifyDmMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({ thread_id: z.string().uuid(), snippet: z.string().max(500) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: t } = await supabase
      .from("dm_threads")
      .select("id, customer_id, business_id, businesses(owner_id, name)")
      .eq("id", data.thread_id)
      .maybeSingle();
    if (!t) return { ok: false, reason: "no_thread" };
    const ownerId = (t.businesses as any)?.owner_id as string | null;
    if (t.customer_id !== userId && ownerId !== userId) return { ok: false, reason: "not_participant" };
    const recipientId = t.customer_id === userId ? ownerId : t.customer_id;
    if (!recipientId) return { ok: false, reason: "no_recipient" };

    const { data: sender } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();
    const { data: recipient } = await supabaseAdmin.auth.admin.getUserById(recipientId);
    const email = recipient?.user?.email;
    if (!email) return { ok: false, reason: "no_recipient_email" };

    const senderLabel = t.customer_id === userId
      ? (sender?.display_name || "A customer")
      : ((t.businesses as any)?.name || "The business");

    const { notifyNewMessage } = await import("./notifications.server");
    return notifyNewMessage(email, senderLabel, data.snippet, "https://spott.ca/dashboard");
  });
