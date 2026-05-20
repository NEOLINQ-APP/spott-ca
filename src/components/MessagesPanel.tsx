import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Thread = {
  id: string;
  business_id: string;
  customer_id: string;
  last_message_at: string | null;
  owner_last_read_at: string | null;
  customer_last_read_at: string | null;
  business?: { name: string; slug: string; owner_id: string | null } | null;
  customer?: { display_name: string | null; avatar_url: string | null } | null;
  unread: number;
};

type Msg = {
  id: string;
  thread_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export function MessagesPanel({ role }: { role: "customer" | "owner" }) {
  const [me, setMe] = useState<string | null>(null);
  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMe(data.user?.id ?? null));
  }, []);

  const loadThreads = async (uid: string) => {
    const { data: tdata } = await supabase
      .from("dm_threads")
      .select("id,business_id,customer_id,last_message_at,owner_last_read_at,customer_last_read_at,businesses(name,slug,owner_id)")
      .order("last_message_at", { ascending: false, nullsFirst: false });
    const rows = (tdata ?? []) as any[];
    const customerIds = Array.from(new Set(rows.map((r) => r.customer_id)));
    const profileMap = new Map<string, { display_name: string | null; avatar_url: string | null }>();
    if (customerIds.length) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,display_name,avatar_url")
        .in("id", customerIds);
      for (const p of profs ?? []) profileMap.set(p.id, { display_name: p.display_name, avatar_url: p.avatar_url });
    }
    const enriched: Thread[] = await Promise.all(rows.map(async (t) => {
      const myReadAt = role === "owner" ? t.owner_last_read_at : t.customer_last_read_at;
      let unread = 0;
      if (t.last_message_at && (!myReadAt || new Date(t.last_message_at) > new Date(myReadAt))) {
        const { count } = await supabase
          .from("dm_messages")
          .select("id", { count: "exact", head: true })
          .eq("thread_id", t.id)
          .neq("sender_id", uid)
          .gt("created_at", myReadAt ?? "1970-01-01");
        unread = count ?? 0;
      }
      return {
        ...t,
        business: t.businesses,
        customer: profileMap.get(t.customer_id) ?? null,
        unread,
      } as Thread;
    }));
    setThreads(enriched);
    setLoading(false);
  };


  useEffect(() => { if (me) loadThreads(me); }, [me, role]);

  // Realtime: new messages
  useEffect(() => {
    if (!me) return;
    const ch = supabase
      .channel(`dm-${me}-${role}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages" }, (payload) => {
        const m = payload.new as Msg;
        if (m.thread_id === activeId) {
          setMsgs((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
        }
        loadThreads(me);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [me, role, activeId]);

  const openThread = async (t: Thread) => {
    setActiveId(t.id);
    const { data } = await supabase
      .from("dm_messages")
      .select("id,thread_id,sender_id,body,created_at")
      .eq("thread_id", t.id)
      .order("created_at", { ascending: true });
    setMsgs((data ?? []) as Msg[]);
    const patch = role === "owner"
      ? { owner_last_read_at: new Date().toISOString() }
      : { customer_last_read_at: new Date().toISOString() };
    await supabase.from("dm_threads").update(patch).eq("id", t.id);
    if (me) loadThreads(me);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const activeThread = threads.find((x) => x.id === activeId) ?? null;
  // Other side's last-read timestamp — used to show "Seen" on the last own message they've seen.
  const otherReadAt = activeThread
    ? (role === "owner" ? activeThread.customer_last_read_at : activeThread.owner_last_read_at)
    : null;
  const myMsgs = msgs.filter((m) => m.sender_id === me);
  const lastSeenMineId = otherReadAt
    ? [...myMsgs].reverse().find((m) => new Date(m.created_at) <= new Date(otherReadAt))?.id ?? null
    : null;

  const send = async () => {
    if (!me || !activeId || !text.trim()) return;
    setSending(true);
    const body = text.trim();
    setText("");
    const { error } = await supabase
      .from("dm_messages")
      .insert({ thread_id: activeId, sender_id: me, body });
    if (error) toast.error(error.message);
    setSending(false);
  };

  const totalUnread = useMemo(() => threads.reduce((s, t) => s + t.unread, 0), [threads]);

  if (loading) return <div className="h-40 animate-pulse rounded-2xl bg-card/60" />;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <MessageCircle className="h-4 w-4 text-primary" /> Messages
          {totalUnread > 0 && <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">{totalUnread}</span>}
        </div>
      </div>
      <div className="grid sm:grid-cols-[260px_1fr] min-h-[360px]">
        <ul className="border-r border-border max-h-[420px] overflow-y-auto">
          {threads.length === 0 && (
            <li className="p-6 text-center text-xs text-muted-foreground">No conversations yet.</li>
          )}
          {threads.map((t) => {
            const title = role === "owner"
              ? (t.customer?.display_name || "Customer") + (t.business ? ` · ${t.business.name}` : "")
              : (t.business?.name ?? "Business");
            return (
              <li key={t.id}>
                <button
                  onClick={() => openThread(t)}
                  className={`w-full text-left px-3 py-2.5 border-b border-border/40 hover:bg-accent/10 ${activeId === t.id ? "bg-accent/10" : ""}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium truncate">{title}</span>
                    {t.unread > 0 && <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">{t.unread}</span>}
                  </div>
                  {t.last_message_at && (
                    <div className="text-[10px] text-muted-foreground">{new Date(t.last_message_at).toLocaleString()}</div>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-col">
          {!activeId ? (
            <div className="grid flex-1 place-items-center p-6 text-xs text-muted-foreground">Select a conversation.</div>
          ) : (
            <>
              <div className="flex-1 space-y-2 overflow-y-auto p-4 max-h-[360px]">
                {msgs.map((m) => {
                  const mine = m.sender_id === me;
                  const showSeen = mine && m.id === lastSeenMineId;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className="max-w-[75%]">
                        <div className={`rounded-2xl px-3 py-2 text-sm ${mine ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
                          <p className="whitespace-pre-wrap">{m.body}</p>
                          <div className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>{new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                        </div>
                        {showSeen && (
                          <div className="mt-1 text-right text-[10px] text-muted-foreground">
                            ✓✓ Seen{otherReadAt ? ` ${new Date(otherReadAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <form
                onSubmit={(e) => { e.preventDefault(); send(); }}
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
                  disabled={sending || !text.trim()}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
