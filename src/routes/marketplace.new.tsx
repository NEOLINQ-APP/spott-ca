import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { getPhotoUploadUrl } from "@/lib/storage.functions";
import { generateListingFromPhotos } from "@/lib/ai-listing.functions";
import { CONDITIONS, LISTING_TYPES } from "@/lib/marketplace";
import { toast } from "sonner";
import { Upload, X, ArrowLeft, Loader2, MapPin, Sparkles } from "lucide-react";
import { PROVINCES, CITIES_BY_PROVINCE, searchCities } from "@/lib/canada";
import { Combobox } from "@/components/ui/combobox";
import { TagInput } from "@/components/ui/tag-input";


export const Route = createFileRoute("/marketplace/new")({
  component: NewListingPage,
});

type Cat = { id: string; slug: string; name: string; parent_slug: string | null };

function NewListingPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const getUploadUrl = useServerFn(getPhotoUploadUrl);
  const generateListing = useServerFn(generateListingFromPhotos);
  const [cats, setCats] = useState<Cat[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [parentSlug, setParentSlug] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [condition, setCondition] = useState("used");
  const [listingType, setListingType] = useState("sale");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("ON");
  const [postal, setPostal] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [compareAt, setCompareAt] = useState("");
  const [photos, setPhotos] = useState<{ file: File; previewUrl: string; uploading: boolean; key: string | null; publicUrl: string | null }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [priceHint, setPriceHint] = useState<{ low: number; high: number; rationale: string } | null>(null);


  useEffect(() => {
    supabase
      .from("marketplace_categories")
      .select("id,slug,name,parent_slug")
      .order("sort_order")
      .then(({ data }) => {
        if (data) setCats(data as Cat[]);
      });
  }, []);

  const topCats = cats.filter((c) => !c.parent_slug);
  const subCats = parentSlug ? cats.filter((c) => c.parent_slug === parentSlug) : [];

  useEffect(() => {
    if (user?.email && !contactEmail) setContactEmail(user.email);
  }, [user]);

  useEffect(() => {
    return () => photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!authLoading && !user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">Sign in to post a listing</h1>
        <p className="mt-2 text-sm text-muted-foreground">You need a free Spott account to sell on the Marketplace.</p>
        <Link
          to="/auth"
          search={{ next: "/marketplace/new" } as any}
          className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files ?? []).slice(0, 8 - photos.length);
    if (!incoming.length) return;

    // Upload immediately (not at final submit) — the AI generator needs a
    // real public URL to look at before the listing exists.
    const newEntries = incoming.map((file) => ({ file, previewUrl: URL.createObjectURL(file), uploading: true, key: null as string | null, publicUrl: null as string | null }));
    setPhotos((prev) => [...prev, ...newEntries]);

    for (const entry of newEntries) {
      try {
        const { uploadUrl, key, publicUrl } = await getUploadUrl({
          data: { kind: "marketplace", filename: entry.file.name, contentType: entry.file.type },
        });
        const putRes = await fetch(uploadUrl, { method: "PUT", body: entry.file, headers: { "Content-Type": entry.file.type } });
        if (!putRes.ok) throw new Error(`upload failed (${putRes.status})`);
        setPhotos((prev) => prev.map((p) => (p === entry ? { ...p, uploading: false, key, publicUrl } : p)));
      } catch (err) {
        console.error("photo upload failed", err);
        toast.error(`Could not upload ${entry.file.name}`);
        setPhotos((prev) => prev.filter((p) => p !== entry));
      }
    }
  };

  const removeAt = (i: number) => setPhotos((prev) => prev.filter((_, idx) => idx !== i));

  const onGenerate = async () => {
    const readyUrls = photos.filter((p) => p.publicUrl).map((p) => p.publicUrl!);
    if (readyUrls.length === 0) {
      toast.error("Upload at least one photo first");
      return;
    }
    setGenerating(true);
    try {
      const result = await generateListing({ data: { photo_urls: readyUrls } });
      setTitle(result.title || title);
      setDescription(result.description || description);
      setCondition(result.condition);
      if (result.suggested_parent_slug) {
        setParentSlug(result.suggested_parent_slug);
        const matchedSub = cats.find((c) => c.slug === result.suggested_category_slug);
        if (matchedSub) setCategoryId(matchedSub.id);
      }
      const midpoint = Math.round((result.price_low_cents + result.price_high_cents) / 2 / 100);
      setPrice(String(midpoint));
      setPriceHint({ low: result.price_low_cents / 100, high: result.price_high_cents / 100, rationale: result.price_rationale });
      toast.success("Sparq drafted your listing — review and edit anything before posting.");
    } catch (err: any) {
      toast.error(err?.message || "Could not generate a listing from these photos");
    } finally {
      setGenerating(false);
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const parentCat = topCats.find((c) => c.slug === parentSlug);
    const effectiveCategoryId = categoryId || parentCat?.id || "";
    if (!title.trim() || !parentSlug || !effectiveCategoryId) {
      toast.error("Title and category are required");
      return;
    }
    if (subCats.length > 0 && !categoryId) {
      toast.error("Please pick a subcategory");
      return;
    }
    setSubmitting(true);
    try {
      const priceCents = Math.round((Number(price) || 0) * 100);
      const { data: listing, error } = await supabase
        .from("marketplace_listings")
        .insert({
          user_id: user.id,
          category_id: effectiveCategoryId,
          title: title.trim(),
          description: description.trim() || null,
          price_cents: priceCents,
          currency: "CAD",
          condition,
          listing_type: listingType,
          city: city.trim() || null,
          province: province.trim() || null,
          postal_code: postal.trim() || null,
          contact_email: contactEmail.trim() || null,
          contact_phone: contactPhone.trim() || null,
          tags,
          compare_at_price_cents: compareAt ? Math.round(Number(compareAt) * 100) : null,
        } as any)

        .select("id")
        .single();
      if (error) throw error;

      // Photos were already uploaded to storage as soon as they were
      // picked (needed for the AI generator to have a real URL to look
      // at) — just link the already-known keys to the new listing now.
      const readyPhotos = photos.filter((p) => p.key);
      for (let i = 0; i < readyPhotos.length; i++) {
        const { error: photoErr } = await supabase.from("marketplace_listing_photos").insert({
          listing_id: listing.id,
          storage_path: readyPhotos[i].key as string,
          sort_order: i,
        });
        if (photoErr) console.error("photo link failed", photoErr);
      }
      toast.success("Listing posted!");
      navigate({ to: "/marketplace/$id", params: { id: listing.id } });
    } catch (err: any) {
      toast.error(err.message ?? "Could not post listing");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link to="/marketplace" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to marketplace
      </Link>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">Post a new listing</h1>
      <p className="mt-1 text-sm text-muted-foreground">Free to post. Reach buyers across Canada.</p>

      <div className="mt-6 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
        <Sparkles className="h-5 w-5 shrink-0 text-primary" />
        <p className="text-muted-foreground">
          <strong className="text-foreground">Have photos?</strong> Add them near the bottom of this form, then tap
          "Let Sparq create this listing" — it'll draft the title, description, and a suggested price range for you
          to review and edit before posting.
        </p>
      </div>

      <form onSubmit={submit} className="mt-6 space-y-6 rounded-2xl border-2 border-border bg-card p-8 sm:p-10 shadow-md">
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
          <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-primary text-[10px] text-primary-foreground">1</span>
            Choose a category
          </div>
          <p className="mb-4 text-xs text-muted-foreground">
            Pick where your listing belongs. This keeps the marketplace organized so buyers can actually find you.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Parent category *">
              <select
                required
                value={parentSlug}
                onChange={(e) => {
                  setParentSlug(e.target.value);
                  setCategoryId("");
                }}
                className="input"
              >
                <option value="">Select a category</option>
                {topCats.map((c) => (
                  <option key={c.id} value={c.slug}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={subCats.length ? "Subcategory *" : "Subcategory"}>
              <select
                required={subCats.length > 0}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                disabled={!parentSlug || subCats.length === 0}
                className="input"
              >
                <option value="">
                  {!parentSlug
                    ? "Pick a parent first"
                    : subCats.length === 0
                    ? "No subcategories"
                    : "Select a subcategory"}
                </option>
                {subCats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>

        <Field label="Title *">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            disabled={!parentSlug}
            maxLength={120}
            placeholder={parentSlug ? "e.g. 2018 Toyota Corolla — low km" : "Pick a category first"}
            className="input"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Listing type">
            <select value={listingType} onChange={(e) => setListingType(e.target.value)} className="input">
              {LISTING_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Price (CAD)">
            <input
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              type="number"
              min="0"
              step="1"
              placeholder={listingType === "free" ? "0" : "0.00"}
              disabled={listingType === "free"}
              className="input"
            />
          </Field>
          <Field label="Condition">
            <select value={condition} onChange={(e) => setCondition(e.target.value)} className="input">
              {CONDITIONS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Compare-at price (optional — shows a strike-through discount)">
          <input
            value={compareAt}
            onChange={(e) => setCompareAt(e.target.value)}
            type="number"
            min="0"
            step="1"
            placeholder="e.g. 999"
            className="input"
          />
        </Field>

        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            maxLength={4000}
            placeholder="Describe what you're selling, condition, pickup details, etc."
            className="input min-h-[120px]"
          />
        </Field>

        <Field label={`Search keywords (${tags.length}/4)`}>
          <TagInput
            tags={tags}
            onChange={setTags}
            max={4}
            placeholder="e.g. vintage, leather, negotiable, pickup"
            suggestions={["vintage", "new", "handmade", "rare", "pickup", "delivery", "negotiable", "firm", "pet-free", "smoke-free"]}
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            Keywords only help buyers <strong>find</strong> your listing in search — they do <strong>not</strong> change which category or directory page it appears on. Category is set above.
          </p>
        </Field>

        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="City">
            <Combobox
              value={city}
              onChange={setCity}
              onPick={(it) => it.sub && setProvince(it.sub)}
              items={(() => {
                const pool = city.trim()
                  ? searchCities(city, 8)
                  : (CITIES_BY_PROVINCE[province] || []).slice(0, 8).map((c) => ({ city: c, province }));
                return pool.map((c) => ({ value: c.city, label: c.city, sub: c.province }));
              })()}
              placeholder="Toronto"
              icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
              inputClassName="input"
            />
          </Field>
          <Field label="Province">
            <select value={province} onChange={(e) => setProvince(e.target.value)} className="input">
              {PROVINCES.map((p) => (
                <option key={p.code} value={p.code}>
                  {p.code} — {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Postal code">
            <input value={postal} onChange={(e) => setPostal(e.target.value)} placeholder="M5V 1A1" maxLength={10} className="input" />
          </Field>
        </div>


        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Contact email">
            <input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} type="email" className="input" />
          </Field>
          <Field label="Contact phone (optional)">
            <input value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} type="tel" className="input" />
          </Field>
        </div>

        <Field label={`Photos (${photos.length}/8)`}>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/40 py-6 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground">
            <Upload className="h-4 w-4" /> Click to add photos
            <input type="file" accept="image/*" multiple onChange={onPick} className="hidden" disabled={photos.length >= 8} />
          </label>
          {photos.length > 0 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {photos.map((p, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-md border border-border">
                  <img src={p.previewUrl} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                  {p.uploading && (
                    <div className="absolute inset-0 grid place-items-center bg-background/70">
                      <Loader2 className="h-4 w-4 animate-spin" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => removeAt(i)}
                    className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-background/90"
                    aria-label="Remove photo"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {photos.some((p) => p.publicUrl) && (
            <button
              type="button"
              onClick={onGenerate}
              disabled={generating || photos.some((p) => p.uploading)}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-primary/40 bg-primary/5 py-3 text-sm font-medium text-primary hover:bg-primary/10 disabled:opacity-60"
            >
              {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {generating ? "Sparq is looking at your photos…" : "Let Sparq create this listing"}
            </button>
          )}
          {priceHint && (
            <div className="mt-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs">
              <p className="font-medium text-foreground">
                Sparq suggests ${priceHint.low.toFixed(0)}–${priceHint.high.toFixed(0)} CAD
              </p>
              <p className="mt-1 text-muted-foreground">{priceHint.rationale}</p>
            </div>
          )}
        </Field>

        <button
          type="submit"
          disabled={submitting}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? "Posting…" : "Post listing"}
        </button>
      </form>

      <style>{`
        .input { width: 100%; border-radius: 0.5rem; border: 2px solid hsl(var(--border)); background: hsl(var(--background)); padding: 0.625rem 0.875rem; font-size: 0.9rem; outline: none; transition: border-color 0.15s, box-shadow 0.15s; }
        .input:hover { border-color: hsl(var(--primary) / 0.5); }
        .input:focus { border-color: hsl(var(--primary)); box-shadow: 0 0 0 3px hsl(var(--primary) / 0.15); }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-xs font-medium text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}
