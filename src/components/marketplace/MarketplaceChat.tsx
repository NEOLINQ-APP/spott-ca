import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { notifyMarketplaceMessage } from "@/lib/notifications.functions";
import { Send, Loader2, X, MessageCircle } from "lucide-react";
import { toast } from "sonner";

type Msg = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

type Props = {
  listingId: string;
  sellerId: string;
  meId: string;
  listingTitle: string;
  onClose: () => void;
};

export function MarketplaceChat({ listingId, sellerId, meId, listingTitle, onClose }: Props) {
  const [threadId, setThreadId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [otherReadAt, setOtherReadAt] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const amSeller = meId === sellerId;

  // Find or create thread
  useEffect(() => {
    let cancel = false;
    async function init() {
      setLoading(true);
      // Buyer perspective: thread keyed (listing_id, buyer_id=me).
      // Seller perspective: find any thread for this listing where I'm seller.
      let q = supabase.from("mp_threads").select("*").eq("listing_id", listingId);
      q = amSeller ? q.eq("seller_id", meId).limit(1) : q.eq("buyer_id", meId).limit(1);
      const { data: existing } = await q.maybeSingle();
      let t = existing as any;
      if (!t && !amSeller) {
        const { data: created, error } = await supabase
          .from("mp_threads")
          .insert({ listing_id: listingId, seller_id: sellerId, buyer_id: meId })
          .select()
          .single();
        if (error) {
          toast.error(error.message);
          setLoading(false);
          return;
        }
        t = created;
      }
      if (cancel || !t) {
        setLoading(false);
        return;
      }
      setThreadId(t.id);
      setOtherReadAt(amSeller ? t.buyer_last_read_at : t.seller_last_read_at);
      const { data: m } = await supabase
        .from("mp_messages")
        .select("*")
        .eq("thread_id", t.id)
        .order("created_at", { ascending: true });
      if (cancel) return;
      setMsgs((m ?? []) as Msg[]);
      // Mark my side read
      const patch = amSeller
        ? { seller_last_read_at: new Date().toISOString() }
        : { buyer_last_read_at: new Date().toISOString() };
      await supabase.from("mp_threads").update(patch).eq("id", t.id);
      setLoading(false);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    }
    init();
    return () => {
      cancel = true;
    };
  }, [listingId, meId, sellerId, amSeller]);

  // Realtime
  useEffect(() => {
    if (!threadId) return;
    const ch = supabase
      .channel(`mp-chat-${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "mp_messages", filter: `thread_id=eq.${threadId}` },
        (payload) => {
          const m = payload.new as Msg;
          setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          // If from other side, mark read
          if (m.sender_id !== meId) {
            const patch = amSeller
              ? { seller_last_read_at: new Date().toISOString() }
              : { buyer_last_read_at: new Date().toISOString() };
            supabase.from("mp_threads").update(patch).eq("id", threadId);
          }
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 30);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "mp_threads", filter: `id=eq.${threadId}` },
        (payload) => {
          const t = payload.new as any;
          setOtherReadAt(amSeller ? t.buyer_last_read_at : t.seller_last_read_at);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [threadId, meId, amSeller]);

  const notify = useServerFn(notifyMarketplaceMessage);

  const send = async () => {
    if (!threadId || !text.trim()) return;
    setSending(true);
    const body = text.trim();
    setText("");
    const { error } = await supabase.from("mp_messages").insert({ thread_id: threadId, sender_id: meId, body });
    if (error) toast.error(error.message);
    else {
      // Fire-and-forget email alert to the other party.
      notify({ data: { thread_id: threadId, snippet: body } }).catch(() => {});
    }
    setSending(false);
  };

  const myMsgs = msgs.filter((m) => m.sender_id === meId);
  const lastSeenMineId = otherReadAt
    ? [...myMsgs].reverse().find((m) => new Date(m.created_at) <= new Date(otherReadAt))?.id ?? null
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-end bg-black/50 p-0 sm:items-center sm:justify-center sm:p-4">
      <div className="flex h-[85vh] w-full max-w-md flex-col rounded-t-2xl border border-border bg-card shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <MessageCircle className="h-4 w-4 text-primary" />
            <span className="truncate">{amSeller ? "Buyer chat" : "Message seller"}</span>
          </div>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-accent/20" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="border-b border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground truncate">
          Re: {listingTitle}
        </div>
        <div className="flex-1 space-y-2 overflow-y-auto p-4">
          {loading ? (
            <div className="grid h-full place-items-center">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : msgs.length === 0 ? (
            <div className="grid h-full place-items-center px-6 text-center text-xs text-muted-foreground">
              {amSeller ? "No messages yet." : "Say hi to the seller — typical replies within a day."}
            </div>
          ) : (
            msgs.map((m) => {
              const mine = m.sender_id === meId;
              const showSeen = mine && m.id === lastSeenMineId;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className="max-w-[78%]">
                    <div
                      className={`rounded-2xl px-3 py-2 text-sm ${
                        mine ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.body}</p>
                      <div className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                    {showSeen && (
                      <div className="mt-1 text-right text-[10px] text-muted-foreground">✓✓ Seen</div>
                    )}
                  </div>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="flex gap-2 border-t border-border p-3"
        >
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <button
            type="submit"
            disabled={sending || !text.trim() || !threadId}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </form>
      </div>
    </div>
  );
}
