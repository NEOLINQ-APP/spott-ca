import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getSparqLearning = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: conversations }, { count: convCount }, { count: msgCount }] =
      await Promise.all([
        supabaseAdmin
          .from("haiku_conversations")
          .select("id,user_id,user_email,user_name,mode,title,message_count,last_message_at,created_at")
          .order("last_message_at", { ascending: false, nullsFirst: false })
          .limit(50),
        supabaseAdmin.from("haiku_conversations").select("id", { count: "exact", head: true }),
        supabaseAdmin.from("haiku_messages").select("id", { count: "exact", head: true }),
      ]);

    return {
      totals: {
        conversations: convCount ?? 0,
        messages: msgCount ?? 0,
      },
      conversations: conversations ?? [],
    };
  });

export const getSparqConversation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { conversationId: string }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: convo } = await supabaseAdmin
      .from("haiku_conversations")
      .select("id,user_id,user_email,user_name,mode,title,created_at")
      .eq("id", data.conversationId)
      .maybeSingle();
    const { data: messages } = await supabaseAdmin
      .from("haiku_messages")
      .select("id,role,parts,created_at")
      .eq("conversation_id", data.conversationId)
      .order("created_at", { ascending: true });

    return { conversation: convo, messages: messages ?? [] };
  });
