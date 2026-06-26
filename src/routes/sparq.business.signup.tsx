import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/sparq/business/signup")({
  head: () => ({
    meta: [
      { title: "Set up Sparq for your business — Spott.ca" },
      { name: "description", content: "Create your Sparq AI workspace. 14-day free trial, install in 2 minutes." },
    ],
  }),
  component: SignupPage,
});

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
}

function SignupPage() {
  const navigate = useNavigate();
  const [authChecking, setAuthChecking] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [businessName, setBusinessName] = useState("");
  const [assistantName, setAssistantName] = useState("Sparq");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [brandColor, setBrandColor] = useState("#3B82F6");
  const [greeting, setGreeting] = useState("Hi! How can I help you today?");
  const [knowledgeBase, setKnowledgeBase] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        toast.info("Please sign in to start your Sparq trial");
        navigate({ to: "/auth", search: { redirect: "/sparq/business/signup" } as never });
      } else {
        setUserId(data.user.id);
      }
      setAuthChecking(false);
    });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId || !businessName.trim()) return;
    setSubmitting(true);
    try {
      const baseSlug = slugify(businessName) || "sparq";
      let slug = baseSlug;
      // Ensure uniqueness
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
        if (websiteUrl) domains.push(new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`).host);
      } catch {/* ignore invalid URL */}

      const { data, error } = await supabase
        .from("sparq_workspaces")
        .insert({
          owner_id: userId,
          slug,
          business_name: businessName.trim(),
          assistant_name: assistantName.trim() || "Sparq",
          brand_color: brandColor,
          greeting: greeting.trim(),
          knowledge_base: knowledgeBase.trim() || null,
          website_url: websiteUrl.trim() || null,
          allowed_domains: domains,
        })
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Sparq workspace created! Your 14-day trial has started.");
      navigate({ to: "/sparq/business/dashboard", search: { id: data.id } as never });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create workspace");
    } finally {
      setSubmitting(false);
    }
  }

  if (authChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <div className="inline-flex h-14 w-14 rounded-2xl bg-primary text-primary-foreground items-center justify-center mb-3">
            <Sparkles className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold">Set up your Sparq</h1>
          <p className="text-muted-foreground mt-2">Takes 2 minutes. 14-day free trial, no card required.</p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label htmlFor="business">Business name *</Label>
              <Input id="business" required value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Joe's Pizza" />
            </div>
            <div>
              <Label htmlFor="website">Your website URL</Label>
              <Input id="website" type="url" value={websiteUrl} onChange={(e) => setWebsiteUrl(e.target.value)} placeholder="https://joespizza.com" />
              <p className="text-xs text-muted-foreground mt-1">Used to allow the embed widget on your domain.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="assistant">Assistant name</Label>
                <Input id="assistant" value={assistantName} onChange={(e) => setAssistantName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="color">Brand color</Label>
                <div className="flex gap-2 items-center">
                  <Input id="color" type="color" value={brandColor} onChange={(e) => setBrandColor(e.target.value)} className="w-16 h-10 p-1" />
                  <Input value={brandColor} onChange={(e) => setBrandColor(e.target.value)} />
                </div>
              </div>
            </div>
            <div>
              <Label htmlFor="greeting">Greeting message</Label>
              <Input id="greeting" value={greeting} onChange={(e) => setGreeting(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="kb">Knowledge base (optional)</Label>
              <Textarea
                id="kb"
                value={knowledgeBase}
                onChange={(e) => setKnowledgeBase(e.target.value)}
                placeholder="Paste your FAQs, hours, services, prices, or anything Sparq should know about your business..."
                rows={8}
              />
              <p className="text-xs text-muted-foreground mt-1">Sparq will reference this when answering customer questions.</p>
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={submitting}>
              {submitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : "Create my Sparq workspace"}
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              By continuing you agree to our <Link to="/terms" className="underline">Terms</Link>.
            </p>
          </form>
        </Card>
      </div>
      <SiteFooter />
    </div>
  );
}
