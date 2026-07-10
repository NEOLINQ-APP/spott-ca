// Zeus Social Media Automator — admin UI.
// Paste a listing/category/update, generate on-brand posts for
// Instagram/TikTok, LinkedIn, X, plus a CTA. Copy-per-section.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Sparkles, Copy, Check, Instagram, Linkedin, Twitter, Megaphone } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-roles";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/zeus/social")({
  component: ZeusSocialPage,
  head: () => ({
    meta: [
      { title: "Zeus — Social Media Automator" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

const PRESETS = [
  { label: "Deal of the day (marketplace)", value: "Highlight today's best marketplace deal on Spott.ca — an item posted well below market value. Focus on the deal-hunter angle for Canadian shoppers." },
  { label: "Featured local business", value: "Spotlight a recently-added local business on Spott.ca (independently owned, community-focused). Emphasize supporting Canadian small business." },
  { label: "Vehicle trending category", value: "Trending vehicle category on Spott.ca this week — used SUVs under $25,000 CAD. Position Spott.ca as the smarter alternative for Canadian car shoppers." },
  { label: "Platform update", value: "Spott.ca just launched Founding Member pricing for local businesses — 90-day free trial, no card required." },
];

type Sections = { ig?: string; li?: string; x?: string; cta?: string; raw: string };

function splitSections(md: string): Sections {
  const out: Sections = { raw: md };
  const parts = md.split(/^##\s+/m).map((s) => s.trim()).filter(Boolean);
  for (const p of parts) {
    const [head, ...rest] = p.split("\n");
    const body = rest.join("\n").trim();
    const h = head.toLowerCase();
    if (h.includes("instagram") || h.includes("tiktok")) out.ig = body;
    else if (h.includes("linkedin")) out.li = body;
    else if (h.startsWith("x") || h.includes("twitter")) out.x = body;
    else if (h.includes("call to action") || h.includes("cta")) out.cta = body;
  }
  return out;
}

function ZeusSocialPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [kind, setKind] = useState<"listing" | "category" | "update" | "auto">("auto");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Sections | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!rolesLoading && user && !isAdmin) navigate({ to: "/" });
  }, [rolesLoading, isAdmin, user, navigate]);

  const canSubmit = useMemo(() => input.trim().length > 0 && !busy, [input, busy]);

  async function generate() {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      if (!token) throw new Error("Not signed in");
      const res = await fetch("/api/zeus/social", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ input: input.trim(), kind }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message ?? "Generation failed");
      setResult(splitSections(json.content ?? ""));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setBusy(false);
    }
  }

  if (authLoading || rolesLoading || !isAdmin) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="container max-w-5xl py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Social Media Automator</h1>
          <p className="text-sm text-muted-foreground">
            On-brand posts for Instagram/TikTok, LinkedIn, and X — plus a Spott.ca CTA.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Input</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setInput(p.value)}
                className="rounded-full border border-border px-3 py-1 text-xs hover:bg-accent"
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <Select value={kind} onValueChange={(v) => setKind(v as typeof kind)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto-detect</SelectItem>
                <SelectItem value="listing">Listing</SelectItem>
                <SelectItem value="category">Category / trend</SelectItem>
                <SelectItem value="update">Platform update</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Paste a listing (title, price, city, key specs) or describe the category / update…"
            rows={6}
            className="resize-y"
          />
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              {input.length} / 4000 chars
            </div>
            <Button onClick={generate} disabled={!canSubmit}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              Generate posts
            </Button>
          </div>
          {error && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}
        </CardContent>
      </Card>

      {result && (
        <div className="grid gap-4 md:grid-cols-2">
          <SectionCard title="Instagram / TikTok" icon={<Instagram className="h-4 w-4" />} body={result.ig} />
          <SectionCard title="LinkedIn" icon={<Linkedin className="h-4 w-4" />} body={result.li} />
          <SectionCard title="X (Twitter)" icon={<Twitter className="h-4 w-4" />} body={result.x} showCharCount />
          <SectionCard title="Call to Action" icon={<Megaphone className="h-4 w-4" />} body={result.cta} />
        </div>
      )}
    </div>
  );
}

function SectionCard({
  title,
  icon,
  body,
  showCharCount,
}: {
  title: string;
  icon: React.ReactNode;
  body?: string;
  showCharCount?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  if (!body) return null;
  async function copy() {
    try {
      await navigator.clipboard.writeText(body!);
      setCopied(true);
      toast.success(`${title} copied`);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Copy failed");
    }
  }
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          {icon}
          {title}
          {showCharCount && (
            <span
              className={`ml-1 text-xs font-normal ${
                body.length > 280 ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {body.length}/280
            </span>
          )}
        </div>
        <Button size="sm" variant="ghost" onClick={copy} className="h-7 px-2">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </CardHeader>
      <CardContent>
        <div className="prose prose-sm dark:prose-invert max-w-none [&_p]:my-2 [&_strong]:text-foreground">
          <ReactMarkdown>{body}</ReactMarkdown>
        </div>
      </CardContent>
    </Card>
  );
}
