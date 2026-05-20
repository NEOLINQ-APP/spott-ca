import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { generateListingDraft, createListingWithAI } from "@/lib/listings.functions";
import { Sparkles, Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/new-listing")({ component: NewListingPage });

const PROVINCES = [
  "AB","BC","MB","NB","NL","NS","NT","NU","ON","PE","QC","SK","YT",
];

function NewListingPage() {
  const navigate = useNavigate();
  const genFn = useServerFn(generateListingDraft);
  const createFn = useServerFn(createListingWithAI);

  const [authChecked, setAuthChecked] = useState(false);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("ON");
  const [pitch, setPitch] = useState("");
  const [description, setDescription] = useState("");
  const [categorySlug, setCategorySlug] = useState("professional-services");
  const [website, setWebsite] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [tagline, setTagline] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) navigate({ to: "/auth" });
      else setAuthChecked(true);
    });
  }, [navigate]);

  const onGenerate = async () => {
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
      toast.success("Draft generated — review and publish.");
    } catch (e: any) {
      toast.error(e?.message || "AI draft failed");
    } finally {
      setGenerating(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description) {
      toast.error("Generate or write a description first.");
      return;
    }
    setSaving(true);
    try {
      const row = await createFn({
        data: {
          name, city, province, pitch,
          description, category_slug: categorySlug,
          website, phone, address,
        },
      });
      toast.success("Submitted! Pending review.");
      navigate({ to: "/browse" });
      void row;
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
            Tell us the basics. Our AI drafts the description, picks a category, and gets you a polished listing in seconds.
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Business name">
              <input value={name} onChange={(e) => setName(e.target.value)} required className={input} placeholder="Bario Coffee Co." />
            </Field>
            <Field label="City">
              <input value={city} onChange={(e) => setCity(e.target.value)} required className={input} placeholder="Toronto" />
            </Field>
            <Field label="Province / Territory">
              <select value={province} onChange={(e) => setProvince(e.target.value)} className={input}>
                {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Website (optional)">
              <input value={website} onChange={(e) => setWebsite(e.target.value)} className={input} placeholder="https://" />
            </Field>
            <Field label="Phone (optional)">
              <input value={phone} onChange={(e) => setPhone(e.target.value)} className={input} placeholder="(416) 555-0123" />
            </Field>
            <Field label="Address (optional)">
              <input value={address} onChange={(e) => setAddress(e.target.value)} className={input} placeholder="123 Queen St W" />
            </Field>
          </div>

          <Field label="1–2 sentence pitch — what makes your business special?">
            <textarea
              value={pitch}
              onChange={(e) => setPitch(e.target.value)}
              required rows={3}
              className={`${input} resize-y`}
              placeholder="Family-run espresso bar serving single-origin coffee and house-made pastries since 2018."
            />
          </Field>

          <button
            type="button" onClick={onGenerate} disabled={generating}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
            {generating ? "Drafting…" : "Generate with AI"}
          </button>

          {tagline && (
            <div className="rounded-md border border-border bg-accent/5 px-3 py-2 text-sm italic text-muted-foreground">
              “{tagline}”
            </div>
          )}

          <Field label="Description">
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              rows={8} className={`${input} resize-y`}
              placeholder="AI will fill this in — you can edit before publishing."
            />
          </Field>

          <Field label="Category">
            <select value={categorySlug} onChange={(e) => setCategorySlug(e.target.value)} className={input}>
              <option value="restaurants-food">Restaurants & Food</option>
              <option value="beauty-personal-care">Beauty & Personal Care</option>
              <option value="health-wellness">Health & Wellness</option>
              <option value="home-services">Home Services</option>
              <option value="automotive">Automotive</option>
              <option value="professional-services">Professional Services</option>
              <option value="shopping-retail">Shopping & Retail</option>
              <option value="events-entertainment">Events & Entertainment</option>
            </select>
          </Field>

          <div className="flex items-center justify-between border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">Listings are reviewed before going live.</p>
            <button
              type="submit" disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} Submit listing
            </button>
          </div>
        </form>
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
