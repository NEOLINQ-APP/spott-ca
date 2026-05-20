import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { generateListingDraft, createListingWithAI } from "@/lib/listings.functions";
import { Sparkles, Loader2, Wand2, ArrowLeft, RotateCw, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/new-listing")({ component: NewListingPage });

const PROVINCES = ["AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT"];
const CATEGORIES = [
  ["restaurants-food", "Restaurants & Food"],
  ["beauty-personal-care", "Beauty & Personal Care"],
  ["health-wellness", "Health & Wellness"],
  ["home-services", "Home Services"],
  ["automotive", "Automotive"],
  ["professional-services", "Professional Services"],
  ["shopping-retail", "Shopping & Retail"],
  ["events-entertainment", "Events & Entertainment"],
] as const;

function NewListingPage() {
  const navigate = useNavigate();
  const genFn = useServerFn(generateListingDraft);
  const createFn = useServerFn(createListingWithAI);

  const [authChecked, setAuthChecked] = useState(false);
  const [stage, setStage] = useState<"basics" | "preview">("basics");

  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("ON");
  const [pitch, setPitch] = useState("");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");

  const [description, setDescription] = useState("");
  const [categorySlug, setCategorySlug] = useState("professional-services");
  const [tagline, setTagline] = useState("");
  const [keywordsText, setKeywordsText] = useState("");

  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) { navigate({ to: "/auth", search: { tab: "business" } as any }); return; }
      const uid = sess.session.user.id;
      const [{ data: roles }, { count }] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid),
        supabase.from("businesses").select("id", { count: "exact", head: true }).eq("owner_id", uid),
      ]);
      const isOwner = ((roles ?? []) as any[]).some((r) => r.role === "owner" || r.role === "admin") || (count ?? 0) > 0;
      if (!isOwner) {
        toast.error("Listings are for business owners. Create a business account to continue.");
        navigate({ to: "/auth", search: { tab: "business" } as any });
        return;
      }
      setAuthChecked(true);
    })();
  }, [navigate]);

  const runGenerate = async () => {
    if (!name || !city || !pitch) {
      toast.error("Add name, city, and a short pitch first.");
      return;
    }
    setGenerating(true);
    try {
      const draft = await genFn({ data: { name, city, province, pitch } });
      setDescription(draft.description);
      setCategorySlug(draft.category_slug);
      setTagline(draft.tagline);
      setKeywordsText((draft.keywords ?? []).join(", "));
      setStage("preview");
      toast.success("AI draft ready — review and publish.");
    } catch (e: any) {
      toast.error(e?.message || "AI draft failed");
    } finally {
      setGenerating(false);
    }
  };

  const onPublish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) { toast.error("Description can't be empty."); return; }
    setSaving(true);
    try {
      const keywords = keywordsText
        .split(",")
        .map((k) => k.trim().toLowerCase())
        .filter((k) => k.length >= 2);
      await createFn({
        data: { name, city, province, pitch, description, category_slug: categorySlug, website, phone, address, keywords },
      });
      toast.success("Submitted! Pending review.");
      toast("Tip: add a reservation or booking link from your dashboard so customers can book in one tap.", { duration: 8000 });
      navigate({ to: "/dashboard" });
    } catch (e: any) {
      toast.error(e?.message || "Could not save listing");
    } finally {
      setSaving(false);
    }
  };

  if (!authChecked) return null;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <Link to="/browse" className="text-xs text-muted-foreground hover:text-foreground">← Back to browse</Link>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">
            <span className="inline-flex items-center gap-2"><Sparkles className="h-6 w-6 text-primary" /> One-click AI listing</span>
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Two quick steps: tell us the basics, then review what our AI drafted before it goes live.
          </p>
          <ol className="mt-5 flex items-center gap-2 text-xs">
            <Stepper n={1} label="Basics" active={stage === "basics"} done={stage === "preview"} />
            <div className="h-px w-8 bg-border" />
            <Stepper n={2} label="Preview & publish" active={stage === "preview"} done={false} />
          </ol>
        </div>

        {stage === "basics" ? (
          <div className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Business name"><input value={name} onChange={(e) => setName(e.target.value)} required className={input} placeholder="Spott Coffee Co." /></Field>
              <Field label="City"><input value={city} onChange={(e) => setCity(e.target.value)} required className={input} placeholder="Toronto" /></Field>
              <Field label="Province / Territory">
                <select value={province} onChange={(e) => setProvince(e.target.value)} className={input}>
                  {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="Website (optional)"><input value={website} onChange={(e) => setWebsite(e.target.value)} className={input} placeholder="https://" /></Field>
              <Field label="Phone (optional)"><input value={phone} onChange={(e) => setPhone(e.target.value)} className={input} placeholder="(416) 555-0123" /></Field>
              <Field label="Address (optional)"><input value={address} onChange={(e) => setAddress(e.target.value)} className={input} placeholder="123 Queen St W" /></Field>
            </div>

            <Field label="1–2 sentence pitch — what makes your business special?">
              <textarea value={pitch} onChange={(e) => setPitch(e.target.value)} required rows={3}
                className={`${input} resize-y`}
                placeholder="Family-run espresso bar serving single-origin coffee and house-made pastries since 2018." />
            </Field>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">AI will draft a polished description and pick a category — you'll get to edit before publishing.</p>
              <button
                type="button" onClick={runGenerate} disabled={generating}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                {generating ? "Drafting…" : "Generate preview"}
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={onPublish} className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <button type="button" onClick={() => setStage("basics")} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <ArrowLeft className="h-3.5 w-3.5" /> Edit basics
              </button>
              <button type="button" onClick={runGenerate} disabled={generating}
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1 text-xs hover:bg-accent/10 disabled:opacity-50">
                {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCw className="h-3 w-3" />} Regenerate
              </button>
            </div>

            <div className="rounded-md border border-primary/30 bg-primary/5 px-4 py-3">
              <div className="text-xs font-medium text-primary uppercase tracking-wide">AI-drafted preview · {name} · {city}, {province}</div>
              {tagline && <p className="mt-2 text-sm italic text-foreground/80">“{tagline}”</p>}
            </div>

            <Field label="Description">
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={10}
                className={`${input} resize-y`} />
            </Field>

            <Field label="Category">
              <select value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)} className={input}>
                {CATEGORIES.map(([slug, label]) => <option key={slug} value={slug}>{label}</option>)}
              </select>
            </Field>

            <div className="flex items-center justify-between border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">Listings are reviewed by our team before going live.</p>
              <button type="submit" disabled={saving}
                className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Publish listing
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}

const input = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function Stepper({ n, label, active, done }: { n: number; label: string; active: boolean; done: boolean }) {
  return (
    <li className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${active ? "bg-primary/10 text-primary" : done ? "text-muted-foreground" : "text-muted-foreground/70"}`}>
      <span className={`grid h-4 w-4 place-items-center rounded-full text-[10px] font-bold ${active ? "bg-primary text-primary-foreground" : done ? "bg-primary/40 text-primary-foreground" : "bg-border text-muted-foreground"}`}>{done ? "✓" : n}</span>
      {label}
    </li>
  );
}
