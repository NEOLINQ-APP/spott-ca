import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Fire welcome email for the currently signed-in user (idempotent-ish; safe to call once at first login). */
export const sendWelcomeEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId, claims } = context;
    const email = (claims as any)?.email;
    if (!email) return { ok: false, reason: "no_email" };
    const { data: profile } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", userId)
      .maybeSingle();
    const { notifyWelcome } = await import("./notifications.server");
    return notifyWelcome(email, profile?.display_name ?? undefined);
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
