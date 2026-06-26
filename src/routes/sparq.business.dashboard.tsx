import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, Loader2, Copy, ExternalLink, Settings, BarChart3, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Workspace = {
  id: string;
  slug: string;
  business_name: string;
  assistant_name: string;
  brand_color: string;
  greeting: string;
  knowledge_base: string | null;
  website_url: string | null;
  allowed_domains: string[];
  status: string;
  plan_tier: string;
  trial_ends_at: string;
  messages_this_month: number;
  monthly_message_limit: number;
};

export const Route = createFileRoute("/sparq/business/dashboard")({
  head: () => ({
    meta: [{ title: "Sparq Dashboard — Spott.ca" }],
  }),
  component: Dashboard,
});

function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [active, setActive] = useState<Workspace | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        navigate({ to: "/auth" });
        return;
      }
      const { data, error } = await supabase
        .from("sparq_workspaces")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) toast.error(error.message);
      else {
        setWorkspaces((data ?? []) as Workspace[]);
        setActive(((data ?? [])[0] as Workspace) ?? null);
      }
      setLoading(false);
    })();
  }, [navigate]);

  async function save() {
    if (!active) return;
    setSaving(true);
    const { error } = await supabase
      .from("sparq_workspaces")
      .update({
        business_name: active.business_name,
        assistant_name: active.assistant_name,
        brand_color: active.brand_color,
        greeting: active.greeting,
        knowledge_base: active.knowledge_base,
        website_url: active.website_url,
        allowed_domains: active.allowed_domains,
      })
      .eq("id", active.id);
    setSaving(false);
    if (error) toast.error(error.message);
    else toast.success("Saved");
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!workspaces.length) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <Sparkles className="h-12 w-12 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">No Sparq workspace yet</h1>
          <p className="text-muted-foreground mb-6">Set one up to add Sparq AI to your website.</p>
          <Button asChild size="lg"><Link to="/sparq/business/signup">Start free trial</Link></Button>
        </div>
        <SiteFooter />
      </div>
    );
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "https://spott.ca";
  const embedSnippet = active
    ? `<script src="${origin}/api/public/sparq/embed.js" data-sparq="${active.slug}" async></script>`
    : "";

  const trialDays = active ? Math.max(0, Math.ceil((new Date(active.trial_ends_at).getTime() - Date.now()) / 86400000)) : 0;

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <Sparkles className="h-7 w-7 text-primary" /> Sparq Dashboard
            </h1>
            <p className="text-muted-foreground text-sm">Manage your AI assistant workspaces.</p>
          </div>
          <Button asChild variant="outline"><Link to="/sparq/business/signup">+ New workspace</Link></Button>
        </div>

        {workspaces.length > 1 && (
          <div className="flex gap-2 mb-4 flex-wrap">
            {workspaces.map((w) => (
              <Button key={w.id} size="sm" variant={active?.id === w.id ? "default" : "outline"} onClick={() => setActive(w)}>
                {w.business_name}
              </Button>
            ))}
          </div>
        )}

        {active && (
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Status */}
            <Card className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <BarChart3 className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Status</h2>
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><Badge variant="outline">{active.plan_tier}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Status</span>
                  <Badge variant={active.status === "trial" ? "secondary" : "default"}>{active.status}</Badge>
                </div>
                {active.status === "trial" && (
                  <div className="flex justify-between"><span className="text-muted-foreground">Trial ends in</span><span className="font-medium">{trialDays} days</span></div>
                )}
                <div className="flex justify-between"><span className="text-muted-foreground">Messages this month</span><span className="font-medium">{active.messages_this_month} / {active.monthly_message_limit}</span></div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${Math.min(100, (active.messages_this_month / Math.max(1, active.monthly_message_limit)) * 100)}%` }} />
                </div>
                <Button asChild size="sm" className="w-full mt-3"><Link to="/business/billing">Upgrade / Manage billing</Link></Button>
              </div>
            </Card>

            {/* Install snippet */}
            <Card className="p-5 lg:col-span-2">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Install on your website</h2>
              </div>
              <p className="text-sm text-muted-foreground mb-3">Paste this line before <code className="text-xs bg-muted px-1 rounded">&lt;/body&gt;</code> on your site.</p>
              <div className="relative">
                <pre className="bg-muted rounded-lg p-4 text-xs overflow-x-auto pr-12">{embedSnippet}</pre>
                <Button size="sm" variant="ghost" className="absolute top-2 right-2"
                  onClick={() => { navigator.clipboard.writeText(embedSnippet); toast.success("Copied!"); }}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-4 flex gap-2 flex-wrap">
                <Button asChild variant="outline" size="sm">
                  <a href={`/api/public/sparq/preview/${active.slug}`} target="_blank" rel="noopener">
                    <ExternalLink className="h-4 w-4 mr-1" /> Preview widget
                  </a>
                </Button>
              </div>
            </Card>

            {/* Settings */}
            <Card className="p-5 lg:col-span-3">
              <div className="flex items-center gap-2 mb-4">
                <Settings className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">Customize</h2>
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Business name</Label>
                  <Input value={active.business_name} onChange={(e) => setActive({ ...active, business_name: e.target.value })} />
                </div>
                <div>
                  <Label>Assistant name</Label>
                  <Input value={active.assistant_name} onChange={(e) => setActive({ ...active, assistant_name: e.target.value })} />
                </div>
                <div>
                  <Label>Brand color</Label>
                  <div className="flex gap-2">
                    <Input type="color" value={active.brand_color} onChange={(e) => setActive({ ...active, brand_color: e.target.value })} className="w-16 h-10 p-1" />
                    <Input value={active.brand_color} onChange={(e) => setActive({ ...active, brand_color: e.target.value })} />
                  </div>
                </div>
                <div>
                  <Label>Website URL</Label>
                  <Input value={active.website_url ?? ""} onChange={(e) => setActive({ ...active, website_url: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Label>Greeting</Label>
                  <Input value={active.greeting} onChange={(e) => setActive({ ...active, greeting: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Label>Knowledge base</Label>
                  <Textarea rows={6} value={active.knowledge_base ?? ""} onChange={(e) => setActive({ ...active, knowledge_base: e.target.value })} />
                </div>
                <div className="md:col-span-2">
                  <Label>Allowed domains (one per line)</Label>
                  <Textarea
                    rows={3}
                    value={active.allowed_domains.join("\n")}
                    onChange={(e) => setActive({ ...active, allowed_domains: e.target.value.split("\n").map((d) => d.trim()).filter(Boolean) })}
                    placeholder="joespizza.com&#10;www.joespizza.com"
                  />
                </div>
              </div>
              <div className="mt-5 flex justify-end">
                <Button onClick={save} disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save changes
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
      <SiteFooter />
    </div>
  );
}
