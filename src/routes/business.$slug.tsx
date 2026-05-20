import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { upsertReview, deleteMyReview } from "@/lib/reviews.functions";
import { toggleFollow, toggleLike, trackView } from "@/lib/social.functions";
import { Star, MapPin, Phone, Globe, Loader2, ImagePlus, X, Trash2, Heart, UserPlus, UserCheck, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/business/$slug")({ component: BusinessPage });

type Business = {
  id: string; slug: string; name: string; description: string | null;
  city: string | null; province: string | null; address: string | null;
  phone: string | null; website: string | null; hero_image_url: string | null;
  status: string; is_claimed: boolean;
};

type Review = {
  id: string; rating: number; body: string; created_at: string; user_id: string;
  profile?: { display_name: string | null; avatar_url: string | null } | null;
  photos: { id: string; storage_path: string }[];
};

const BUCKET = "review-photos";
const photoUrl = (path: string) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

function BusinessPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [biz, setBiz] = useState<Business | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadReviews = useCallback(async (businessId: string) => {
    const { data } = await supabase
      .from("reviews")
      .select("id,rating,body,created_at,user_id,review_photos(id,storage_path),profiles(display_name,avatar_url)")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });
    const rows: Review[] = (data ?? []).map((r: any) => ({
      id: r.id, rating: r.rating, body: r.body, created_at: r.created_at, user_id: r.user_id,
      profile: r.profiles ?? null,
      photos: r.review_photos ?? [],
    }));
    setReviews(rows);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setUserId(data.session?.user.id ?? null));
    supabase
      .from("businesses")
      .select("id,slug,name,description,city,province,address,phone,website,hero_image_url,status,is_claimed")
      .eq("slug", slug)
      .maybeSingle()
      .then(async ({ data }) => {
        if (!data) { setLoading(false); return; }
        setBiz(data as Business);
        await loadReviews(data.id);
        setLoading(false);
      });
  }, [slug, loadReviews]);

  if (loading) return (
    <div className="min-h-screen"><SiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6"><div className="h-64 animate-pulse rounded-2xl bg-card/60" /></div>
    </div>
  );

  if (!biz) return (
    <div className="min-h-screen"><SiteHeader />
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 text-center">
        <h1 className="font-display text-2xl">Business not found</h1>
        <Link to="/browse" className="mt-4 inline-block text-sm text-primary hover:underline">← Back to browse</Link>
      </div>
    </div>
  );

  const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const myReview = userId ? reviews.find((r) => r.user_id === userId) ?? null : null;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <article className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Link to="/browse" className="text-xs text-muted-foreground hover:text-foreground">← Browse</Link>

        <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{biz.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {(biz.city || biz.province) && (
                <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {[biz.city, biz.province].filter(Boolean).join(", ")}</span>
              )}
              {biz.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3.5 w-3.5" /> {biz.phone}</span>}
              {biz.website && (
                <a href={biz.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
                  <Globe className="h-3.5 w-3.5" /> Website
                </a>
              )}
            </div>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center gap-1 text-2xl font-semibold">
              <Star className="h-5 w-5 fill-primary text-primary" />
              {reviews.length ? avg.toFixed(1) : "—"}
            </div>
            <div className="text-xs text-muted-foreground">{reviews.length} review{reviews.length === 1 ? "" : "s"}</div>
          </div>
        </header>

        {biz.status === "pending" && (
          <div className="mt-6 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-300">
            This listing is pending review.
          </div>
        )}

        {biz.description && (
          <p className="mt-6 whitespace-pre-line text-[15px] leading-relaxed text-foreground/90">{biz.description}</p>
        )}

        <section className="mt-12">
          <h2 className="font-display text-xl font-semibold">Reviews</h2>
          {!userId ? (
            <div className="mt-4 rounded-lg border border-border bg-card p-5 text-sm">
              <Link to="/auth" className="text-primary hover:underline">Sign in</Link> to write a review.
            </div>
          ) : (
            <ReviewForm
              businessId={biz.id}
              userId={userId}
              existing={myReview}
              onSaved={() => loadReviews(biz.id)}
              onDeleted={() => loadReviews(biz.id)}
            />
          )}

          <ul className="mt-8 space-y-6">
            {reviews.length === 0 && (
              <li className="rounded-lg border border-dashed border-border bg-card/40 p-8 text-center text-sm text-muted-foreground">
                Be the first to review.
              </li>
            )}
            {reviews.map((r) => (
              <li key={r.id} className="rounded-xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {r.profile?.avatar_url ? (
                      <img src={r.profile.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <div className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-xs">{(r.profile?.display_name || "?").slice(0, 1).toUpperCase()}</div>
                    )}
                    <div>
                      <div className="text-sm font-medium">{r.profile?.display_name || "Reviewer"}</div>
                      <div className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <StarRow value={r.rating} />
                </div>
                <p className="mt-3 whitespace-pre-line text-sm text-foreground/90">{r.body}</p>
                {r.photos.length > 0 && (
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {r.photos.map((p) => (
                      <a key={p.id} href={photoUrl(p.storage_path)} target="_blank" rel="noreferrer" className="block aspect-square overflow-hidden rounded-md bg-secondary">
                        <img src={photoUrl(p.storage_path)} alt="" className="h-full w-full object-cover" loading="lazy" />
                      </a>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      </article>
    </div>
  );
  void navigate;
}

function StarRow({ value, onPick }: { value: number; onPick?: (n: number) => void }) {
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n} type="button" disabled={!onPick}
          onClick={() => onPick?.(n)}
          className={onPick ? "cursor-pointer" : "cursor-default"}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
        >
          <Star className={`h-5 w-5 ${n <= value ? "fill-primary text-primary" : "text-muted-foreground"}`} />
        </button>
      ))}
    </div>
  );
}

function ReviewForm({
  businessId, userId, existing, onSaved, onDeleted,
}: {
  businessId: string; userId: string;
  existing: Review | null;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const save = useServerFn(upsertReview);
  const del = useServerFn(deleteMyReview);
  const [rating, setRating] = useState(existing?.rating ?? 5);
  const [body, setBody] = useState(existing?.body ?? "");
  const [existingPaths, setExistingPaths] = useState<string[]>(existing?.photos.map((p) => p.storage_path) ?? []);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setRating(existing?.rating ?? 5);
    setBody(existing?.body ?? "");
    setExistingPaths(existing?.photos.map((p) => p.storage_path) ?? []);
    setNewFiles([]);
  }, [existing?.id]);

  const totalPhotos = existingPaths.length + newFiles.length;
  const canAddMore = totalPhotos < 4;

  const onFiles = (files: FileList | null) => {
    if (!files) return;
    const remaining = 4 - totalPhotos;
    const picked = Array.from(files).slice(0, remaining);
    setNewFiles((prev) => [...prev, ...picked]);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (body.trim().length < 5) { toast.error("Write a bit more (5+ chars)."); return; }
    setSaving(true);
    try {
      const uploadedPaths: string[] = [];
      for (const file of newFiles) {
        const ext = (file.name.split(".").pop() || "jpg").toLowerCase().slice(0, 5);
        const path = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: false, contentType: file.type });
        if (error) throw new Error(error.message);
        uploadedPaths.push(path);
      }
      const finalPaths = [...existingPaths, ...uploadedPaths].slice(0, 4);
      await save({ data: { business_id: businessId, rating, body: body.trim(), photo_paths: finalPaths } });
      toast.success(existing ? "Review updated" : "Review posted");
      setNewFiles([]);
      onSaved();
    } catch (e: any) {
      toast.error(e?.message || "Could not save review");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async () => {
    if (!existing) return;
    if (!confirm("Delete your review?")) return;
    try {
      await del({ data: { review_id: existing.id } });
      toast.success("Review deleted");
      onDeleted();
    } catch (e: any) {
      toast.error(e?.message || "Could not delete");
    }
  };

  return (
    <form onSubmit={submit} className="mt-4 space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{existing ? "Edit your review" : "Write a review"}</span>
        <StarRow value={rating} onPick={setRating} />
      </div>
      <textarea
        value={body} onChange={(e) => setBody(e.target.value)} rows={4}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary resize-y"
        placeholder="Share your experience…" required
      />

      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Photos · {totalPhotos}/4 (free)</span>
          {canAddMore && (
            <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-xs hover:bg-accent/10">
              <ImagePlus className="h-3.5 w-3.5" />
              Add photos
              <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} />
            </label>
          )}
        </div>
        {totalPhotos > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {existingPaths.map((path) => (
              <div key={path} className="relative aspect-square overflow-hidden rounded-md bg-secondary">
                <img src={photoUrl(path)} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => setExistingPaths((p) => p.filter((x) => x !== path))}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {newFiles.map((f, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-md bg-secondary">
                <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                <button type="button" onClick={() => setNewFiles((files) => files.filter((_, x) => x !== i))}
                  className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3">
        {existing ? (
          <button type="button" onClick={onDelete} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" /> Delete review
          </button>
        ) : <span />}
        <button type="submit" disabled={saving}
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {saving && <Loader2 className="h-4 w-4 animate-spin" />} {existing ? "Update review" : "Post review"}
        </button>
      </div>
    </form>
  );
}
