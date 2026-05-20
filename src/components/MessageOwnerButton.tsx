import { useState } from "react";
import { MessageCircle, X, Send, Loader2 } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function MessageOwnerButton({
  businessId,
  ownerId,
  userId,
}: {
  businessId: string;
  ownerId: string | null;
  userId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  if (!ownerId) return null;
  if (userId === ownerId) return null;

  const send = async () => {
    if (!userId || !body.trim()) return;
    setSending(true);
    try {
      const { data: existing } = await supabase
        .from("dm_threads")
        .select("id")
        .eq("business_id", businessId)
        .eq("customer_id", userId)
        .maybeSingle();
      let threadId = existing?.id;
      if (!threadId) {
        const { data: created, error } = await supabase
          .from("dm_threads")
          .insert({ business_id: businessId, customer_id: userId })
          .select("id")
          .single();
        if (error) throw error;
        threadId = created.id;
      }
      const { error: mErr } = await supabase
        .from("dm_messages")
        .insert({ thread_id: threadId, sender_id: userId, body: body.trim() });
      if (mErr) throw mErr;
      toast.success("Message sent — see Dashboard › Messages for replies.");
      setBody("");
      setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not send");
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent/10"
      >
        <MessageCircle className="h-3.5 w-3.5" /> Message owner
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={() => setOpen(false)}>
          <div className="w-full max-w-md rounded-2xl bg-background p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold">Message the owner</h3>
              <button onClick={() => setOpen(false)} aria-label="Close" className="rounded-full bg-secondary p-1.5 hover:bg-secondary/80">
                <X className="h-4 w-4" />
              </button>
            </div>
            {!userId ? (
              <p className="mt-4 text-sm text-muted-foreground">
                <Link to="/auth" className="text-primary hover:underline">Sign in</Link> to send a message.
              </p>
            ) : (
              <>
                <textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  rows={5}
                  placeholder="Hi! I'd love to know more about…"
                  className="mt-4 w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
                <div className="mt-3 flex justify-end gap-2">
                  <button onClick={() => setOpen(false)} className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent/10">Cancel</button>
                  <button
                    onClick={send}
                    disabled={sending || !body.trim()}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  >
                    {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Send
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
