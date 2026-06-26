import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Sparkles, Loader2, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/sparq/business/concierge")({
  head: () => ({
    meta: [
      { title: "Chat with Sparq to set up — Spott.ca" },
      {
        name: "description",
        content: "Let Sparq walk you through setting up your AI assistant in a quick conversation.",
      },
    ],
  }),
  component: ConciergePage,
});

type Msg = { role: "user" | "assistant"; content: string };
type Fields = {
  business_name?: string;
  assistant_name?: string;
  website_url?: string;
  brand_color?: string;
  greeting?: string;
  knowledge_base?: string;
};

function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function ConciergePage() {
  const navigate = useNavigate();
  const [authChecking, setAuthChecking] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "Hey! I'm Sparq 👋 I'll have your assistant ready in just a few questions. What's the name of your business?",
    },
  ]);
  const [fields, setFields] = useState<Fields>({});
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [creating, setCreating] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        toast.info("Please sign in to start your Sparq trial");
        navigate({
          to: "/auth",
          search: { redirect: "/sparq/business/concierge" } as never,
        });
      } else {
        setUserId(data.user.id);
      }
      setAuthChecking(false);
    });
  }, [navigate]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, thinking]);

  async function createWorkspace(finalFields: Fields) {
    if (!userId) return;
    setCreating(true);
    try {
      const businessName = (finalFields.business_name || "My Business").trim();
      const baseSlug = slugify(businessName) || "sparq";
      let slug = baseSlug;
      for (let i = 0; i < 5; i++) {
        const { data: existing } = await supabase
          .from("sparq_workspaces")
          .select("id")
          .eq("slug", slug)
          .maybeSingle();
        if (!existing) break;
        slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;
      }
      const domains: string[] = [];
      try {
        if (finalFields.website_url) {
          const u = finalFields.website_url.startsWith("http")
            ? finalFields.website_url
            : `https://${finalFields.website_url}`;
          domains.push(new URL(u).host);
        }
      } catch {
        /* ignore */
      }

      const { data, error } = await supabase
        .from("sparq_workspaces")
        .insert({
          owner_id: userId,
          slug,
          business_name: businessName,
          assistant_name: (finalFields.assistant_name || "Sparq").trim(),
          brand_color: finalFields.brand_color || "#3B82F6",
          greeting: (finalFields.greeting || "Hi! How can I help you today?").trim(),
          knowledge_base: finalFields.knowledge_base?.trim() || null,
          website_url: finalFields.website_url?.trim() || null,
          allowed_domains: domains,
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Workspace created — welcome to Sparq!");
      navigate({ to: "/sparq/business/dashboard", search: { id: data.id } as never });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create workspace");
      setCreating(false);
    }
  }

  async function send() {
    const text = input.trim();
    if (!text || thinking || creating) return;
    const nextMessages: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setThinking(true);
    try {
      const res = await fetch("/api/sparq/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages, fields }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as {
        reply: string;
        fields: Fields;
        complete: boolean;
      };
      const mergedFields: Fields = { ...fields, ...data.fields };
      setFields(mergedFields);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply || "..." },
      ]);
      if (data.complete) {
        setTimeout(() => createWorkspace(mergedFields), 600);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sparq is taking a break");
    } finally {
      setThinking(false);
    }
  }

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const collected = Object.entries(fields).filter(([, v]) => v && String(v).trim());

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader />
      <div className="flex-1 max-w-3xl w-full mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-primary text-primary-foreground items-center justify-center mb-3">
            <Sparkles className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold">Set up Sparq — the easy way</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Just chat. Sparq will build your assistant as you go.{" "}
            <Link to="/sparq/business/signup" className="underline">
              Prefer a form?
            </Link>
          </p>
        </div>

        <Card className="flex flex-col h-[60vh]">
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 text-sm ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  }`}
                >
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
              </div>
            ))}
            {(thinking || creating) && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl px-4 py-2 text-sm flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {creating ? "Creating your workspace…" : "Sparq is typing…"}
                </div>
              </div>
            )}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="border-t p-3 flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your answer…"
              disabled={thinking || creating}
              autoFocus
            />
            <Button type="submit" disabled={!input.trim() || thinking || creating}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </Card>

        {collected.length > 0 && (
          <Card className="mt-4 p-4">
            <p className="text-xs font-semibold text-muted-foreground mb-2">
              What Sparq has so far
            </p>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {collected.map(([k, v]) => (
                <div key={k} className="flex gap-2">
                  <dt className="text-muted-foreground capitalize">
                    {k.replace(/_/g, " ")}:
                  </dt>
                  <dd className="font-medium truncate" title={String(v)}>
                    {k === "brand_color" ? (
                      <span className="inline-flex items-center gap-1">
                        <span
                          className="inline-block h-3 w-3 rounded-full border"
                          style={{ background: String(v) }}
                        />
                        {String(v)}
                      </span>
                    ) : k === "knowledge_base" ? (
                      `${String(v).slice(0, 40)}${String(v).length > 40 ? "…" : ""}`
                    ) : (
                      String(v)
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </Card>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
