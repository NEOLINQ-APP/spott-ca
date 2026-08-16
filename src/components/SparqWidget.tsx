// Global Sparq text-only chat widget.
// - Floating button in bottom-right, mounted from __root.
// - Text chat with trial gating (server enforces).
// - "Generate image" button prompts subscription for non-paid users.
import { useEffect, useRef, useState } from "react";
import { Sparkles, X, Send, ImageIcon, Loader2, Lock } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

type Msg = { role: "user" | "assistant"; content: string; image?: string };

export function SparqWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hi, I'm **Sparq** — your Spott.ca assistant. I can help you find businesses, browse listings, or write your next ad. What are you working on?",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsUpgrade, setNeedsUpgrade] = useState(false);
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [imgMode, setImgMode] = useState(false);
  const conversationIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function getToken() {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  }

  async function send() {
    const trimmed = input.trim();
    if (!trimmed || busy) return;
    setError(null);
    setNeedsUpgrade(false);
    const token = await getToken();
    if (!token) {
      setError("Please sign in to chat with Sparq.");
      return;
    }
    const newMsgs: Msg[] = [...messages, { role: "user", content: trimmed }];
    setMessages(newMsgs);
    setInput("");
    setBusy(true);

    try {
      if (imgMode) {
        const res = await fetch("/api/sparq/image", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ prompt: trimmed }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (data?.error?.code === "subscription_required") {
            setNeedsUpgrade(true);
            setMessages((m) => [
              ...m,
              {
                role: "assistant",
                content:
                  "🔒 **Image generation is a Pro feature.** Upgrade to Spott Pro to generate images with Sparq.",
              },
            ]);
          } else {
            setError(data?.error?.message ?? "Image generation failed.");
          }
        } else {
          setMessages((m) => [
            ...m,
            { role: "assistant", content: "Here's your image:", image: data.image },
          ]);
        }
        setImgMode(false);
      } else {
        const res = await fetch("/api/sparq/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            messages: newMsgs.map((m) => ({ role: m.role, content: m.content })),
            conversationId: conversationIdRef.current ?? undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (data?.error?.code === "trial_exhausted") {
            setNeedsUpgrade(true);
            setMessages((m) => [
              ...m,
              {
                role: "assistant",
                content: `🔒 ${data.error.message} [See plans →](/pricing)`,
              },
            ]);
          } else {
            setError(data?.error?.message ?? "Sparq couldn't respond right now.");
          }
        } else {
          if (data.conversationId) conversationIdRef.current = data.conversationId;
          setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Network error");
    } finally {
      setBusy(false);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <>
      {/* Floating button */}
      <button
        aria-label="Open Sparq assistant"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed z-40 bottom-20 right-4 md:bottom-6 md:right-6 h-14 w-14 rounded-full shadow-lg",
          "bg-gradient-to-br from-primary to-primary/70 text-primary-foreground",
          "flex items-center justify-center transition-transform hover:scale-105",
          open && "scale-90 opacity-80",
        )}
      >
        <Sparkles className="h-6 w-6" />
      </button>

      {open && (
        <div className="fixed z-50 inset-x-2 bottom-20 md:inset-x-auto md:bottom-24 md:right-6 md:w-[380px] md:max-w-[95vw] max-h-[80vh] flex flex-col rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-muted/40">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <div>
                <div className="text-sm font-semibold">Sparq</div>
                <div className="text-[10px] text-muted-foreground">Spott.ca assistant · text only</div>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="rounded-md p-1 hover:bg-accent"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3 text-sm">
            {messages.map((m, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] rounded-2xl px-3 py-2",
                  m.role === "user"
                    ? "ml-auto bg-primary text-primary-foreground"
                    : "mr-auto bg-muted text-foreground",
                )}
              >
                <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-1 [&_ul]:my-1 [&_a]:underline">
                  <ReactMarkdown>{m.content}</ReactMarkdown>
                </div>
                {m.image && (
                  <img
                    src={m.image}
                    alt="Generated"
                    className="mt-2 rounded-lg border border-border max-w-full"
                  />
                )}
              </div>
            ))}
            {busy && (
              <div className="mr-auto flex items-center gap-2 rounded-2xl bg-muted px-3 py-2 text-xs text-muted-foreground">
                <Loader2 className="h-3 w-3 animate-spin" />
                {imgMode ? "Generating image…" : "Sparq is thinking…"}
              </div>
            )}
            {error && (
              <div className="mr-auto rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                {error}
              </div>
            )}
            {needsUpgrade && (
              <Button asChild size="sm" className="w-full">
                <Link to="/pricing">Upgrade to Pro</Link>
              </Button>
            )}
          </div>

          {/* Composer */}
          <div className="border-t border-border p-2 space-y-2">
            {authed === false && (
              <div className="rounded-lg border border-border bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                <Link to="/auth" className="font-medium text-primary underline">
                  Sign in
                </Link>{" "}
                to chat with Sparq.
              </div>
            )}
            {imgMode && (
              <div className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs flex items-center gap-2">
                <ImageIcon className="h-3 w-3" />
                <span className="flex-1">Describe the image you want…</span>
                <button
                  onClick={() => setImgMode(false)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            )}
            <div className="flex items-end gap-2">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder={imgMode ? "A photo of a food-truck…" : "Ask Sparq anything about Spott.ca…"}
                rows={1}
                className="min-h-[40px] max-h-32 resize-none text-sm"
                disabled={busy || authed === false}
              />
              <div className="flex flex-col gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setImgMode((v) => !v)}
                  title={imgMode ? "Text mode" : "Generate image (Pro)"}
                  disabled={busy || authed === false}
                  className="h-9 w-9"
                >
                  {imgMode ? <Lock className="h-4 w-4" /> : <ImageIcon className="h-4 w-4" />}
                </Button>
                <Button
                  size="icon"
                  onClick={send}
                  disabled={busy || !input.trim() || authed === false}
                  className="h-9 w-9"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
