import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CONDITIONS, LISTING_TYPES } from "@/lib/marketplace";
import { toast } from "sonner";
import { Upload, X, ArrowLeft, Loader2, MapPin } from "lucide-react";
import { PROVINCES, CITIES_BY_PROVINCE, searchCities } from "@/lib/canada";
import { Combobox } from "@/components/ui/combobox";
import { TagInput } from "@/components/ui/tag-input";


export const Route = createFileRoute("/marketplace/new")({
  component: NewListingPage,
});

type Cat = { id: string; name: string };

function NewListingPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [cats, setCats] = useState<Cat[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
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
  const [commission, setCommission] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);


  useEffect(() => {
    supabase.from("marketplace_categories").select("id,name").order("sort_order").then(({ data }) => {
      if (data) setCats(data);
    });
  }, []);

  useEffect(() => {
    if (user?.email && !contactEmail) setContactEmail(user.email);
  }, [user]);

  useEffect(() => {
    const urls = files.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);

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

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files ?? []);
    if (!incoming.length) return;
    setFiles((prev) => [...prev, ...incoming].slice(0, 8));
  };

  const removeAt = (i: number) => setFiles((prev) => prev.filter((_, idx) => idx !== i));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim() || !categoryId) {
      toast.error("Title and category are required");
      return;
    }
    setSubmitting(true);
    try {
      const priceCents = Math.round((Number(price) || 0) * 100);
      const { data: listing, error } = await supabase
        .from("marketplace_listings")
        .insert({
          user_id: user.id,
          category_id: categoryId,
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
          commission_cents: commission ? Math.round(Number(commission) * 100) : null,
        } as any)

        .select("id")
        .single();
      if (error) throw error;

      // Upload photos
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
        const path = `${user.id}/${listing.id}/${Date.now()}-${i}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("marketplace-photos")
          .upload(path, f, { cacheControl: "3600", upsert: false, contentType: f.type });
        if (upErr) {
          console.error(upErr);
          continue;
        }
        await supabase.from("marketplace_listing_photos").insert({
          listing_id: listing.id,
          storage_path: path,
          sort_order: i,
        });
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

      <form onSubmit={submit} className="mt-8 space-y-5 rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm">
        <Field label="Title *">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={120}
            placeholder="e.g. 2018 Toyota Corolla — low km"
            className="input"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category *">
            <select required value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="input">
              <option value="">Select a category</option>
              {cats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Field>
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

        <div className="grid gap-4 sm:grid-cols-2">
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
          <Field label="Promoter commission per sale (optional, CAD)">
            <input
              value={commission}
              onChange={(e) => setCommission(e.target.value)}
              type="number"
              min="0"
              step="1"
              placeholder="e.g. 25"
              className="input"
            />
          </Field>
        </div>

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

        <Field label={`Tags (${tags.length}/4)`}>
          <TagInput
            tags={tags}
            onChange={setTags}
            max={4}
            placeholder="e.g. vintage, leather, bike, oak"
            suggestions={["vintage", "new", "handmade", "rare", "pickup", "delivery", "negotiable", "firm", "pet-free", "smoke-free"]}
          />
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

        <Field label={`Photos (${files.length}/8)`}>
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card/40 py-6 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground">
            <Upload className="h-4 w-4" /> Click to add photos
            <input type="file" accept="image/*" multiple onChange={onPick} className="hidden" />
          </label>
          {previews.length > 0 && (
            <div className="mt-3 grid grid-cols-4 gap-2">
              {previews.map((src, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-md border border-border">
                  <img src={src} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
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
        .input { width: 100%; border-radius: 0.5rem; border: 1px solid hsl(var(--border)); background: hsl(var(--background)); padding: 0.5rem 0.75rem; font-size: 0.875rem; outline: none; }
        .input:focus { border-color: hsl(var(--primary)); }
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
