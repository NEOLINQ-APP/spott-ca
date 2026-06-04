import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { upsertReview, deleteMyReview } from "@/lib/reviews.functions";
import { toggleFollow, toggleLike, trackView } from "@/lib/social.functions";
import { updateBusinessKeywords, getBusinessTagInfo } from "@/lib/business.functions";
import { redeemCoupon } from "@/lib/coupons.functions";
import { useStripeCheckout } from "@/hooks/useStripeCheckout";
import { Star, MapPin, Phone, Mail, Globe, Loader2, ImagePlus, X, Trash2, Heart, UserPlus, UserCheck, MessageSquare, Tag, Pencil, Check } from "lucide-react";
import { toast } from "sonner";
import { lazy, Suspense } from "react";
import { ClientOnly } from "@tanstack/react-router";
const BusinessMap = lazy(() => import("@/components/business-map").then(m => ({ default: m.BusinessMap })));
import { BusinessSpecials } from "@/components/business-specials";
import { MessageOwnerButton } from "@/components/MessageOwnerButton";
import { AddFriendButton } from "@/components/AddFriendButton";
import { ShareButton } from "@/components/ShareButton";
import { SocialShareBar } from "@/components/SocialShareBar";
import { OrderingPanel, type OrderingLinks } from "@/components/OrderingPanel";
import { Car, CalendarCheck } from "lucide-react";


import { AuthGate } from "@/components/AuthGate";

export const Route = createFileRoute("/business/$slug")({
  component: BusinessPageGated,
  loader: async ({ params }) => {
    const { data } = await supabase
      .from("businesses")
      .select("name,city,province,description,hero_image_url")
      .eq("slug", params.slug)
      .eq("status", "approved")
      .maybeSingle();
    return { biz: data };
  },
  head: ({ params, loaderData }) => {
    const b = loaderData?.biz;
    const name = b?.name ?? "Business";
    const where = b?.city ? `${b.city}${b.province ? `, ${b.province}` : ""}` : "Canada";
    const title = `${name} in ${where} — Spott.ca`;
    const rawDesc = b?.description?.trim();
    const description = rawDesc
      ? rawDesc.slice(0, 155)
      : `${name} — verified ${b?.city ? `${b.city} ` : ""}business listing on Spott.ca. See reviews, hours, and contact info.`;
    const url = `https://www.spott.ca/business/${params.slug}`;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:type", content: "article" },
    ];
    if (b?.hero_image_url) {
      meta.push({ property: "og:image", content: b.hero_image_url });
      meta.push({ name: "twitter:image", content: b.hero_image_url });
      meta.push({ name: "twitter:card", content: "summary_large_image" });
    }
    return { meta, links: [{ rel: "canonical", href: url }] };
  },
});

type Business = {
  id: string; slug: string; name: string; description: string | null;
  city: string | null; province: string | null; address: string | null;
  phone: string | null; email: string | null; website: string | null; hero_image_url: string | null;
  status: string; is_claimed: boolean; owner_id: string | null;
  postal_code: string | null; latitude: number | null; longitude: number | null;
  booking_url: string | null; booking_label: string | null;
  keywords: string[] | null;
  ordering_links: OrderingLinks | null;
};

type Review = {
  id: string; rating: number; body: string; created_at: string; user_id: string;
  owner_reply: string | null; owner_reply_at: string | null;
  profile?: { display_name: string | null; avatar_url: string | null } | null;
  photos: { id: string; storage_path: string }[];
  like_count: number; liked_by_me: boolean;
};

const BUCKET = "review-photos";
const photoUrl = (path: string) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

function BusinessPageGated() {
  const { slug } = Route.useParams();
  return (
    <AuthGate
      redirectTo={`/business/${slug}`}
      title="Sign in to view this business"
      description="Create a free account or sign in to see full details, photos, reviews, and contact information."
      backTo="/"
      backLabel="← Back to home"
    >
      <BusinessPage />
    </AuthGate>
  );
}

function BusinessPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const [biz, setBiz] = useState<Business | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [following, setFollowing] = useState(false);
  const followFn = useServerFn(toggleFollow);
  const likeFn = useServerFn(toggleLike);
  const viewFn = useServerFn(trackView);

  const loadReviews = useCallback(async (businessId: string, uid: string | null) => {
    const { data } = await supabase
      .from("reviews")
      .select("id,rating,body,created_at,user_id,owner_reply,owner_reply_at,review_photos(id,storage_path),profiles(display_name,avatar_url),review_likes(user_id)")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false });
    const rows: Review[] = (data ?? []).map((r: any) => ({
      id: r.id, rating: r.rating, body: r.body, created_at: r.created_at, user_id: r.user_id,
      owner_reply: r.owner_reply, owner_reply_at: r.owner_reply_at,
      profile: r.profiles ?? null,
      photos: r.review_photos ?? [],
      like_count: (r.review_likes ?? []).length,
      liked_by_me: uid ? (r.review_likes ?? []).some((l: any) => l.user_id === uid) : false,
    }));
    setReviews(rows);
  }, []);

  const [gallery, setGallery] = useState<{ id: string; storage_path: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id ?? null;
      if (cancelled) return;
      setUserId(uid);
      const { data } = await supabase
        .from("businesses")
        .select("id,slug,name,description,city,province,address,phone,email,website,hero_image_url,status,is_claimed,owner_id,postal_code,latitude,longitude,booking_url,booking_label,keywords,ordering_links")
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled) return;
      if (!data) { setLoading(false); return; }
      setBiz(data as unknown as Business);
      await loadReviews(data.id, uid);
      const { data: ph } = await supabase
        .from("business_photos")
        .select("id,storage_path,sort_order")
        .eq("business_id", data.id)
        .order("sort_order", { ascending: true });
      if (!cancelled) setGallery((ph ?? []) as any);
      if (uid) {
        const { data: fol } = await supabase
          .from("business_follows")
          .select("id").eq("user_id", uid).eq("business_id", data.id).maybeSingle();
        setFollowing(!!fol);
        viewFn({ data: { business_id: data.id } }).catch(() => {});
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [slug, loadReviews, viewFn]);

  const onToggleFollow = async () => {
    if (!userId) { toast.error("Sign in to follow"); return; }
    if (!biz) return;
    setFollowing((f) => !f);
    try {
      const res = await followFn({ data: { business_id: biz.id } });
      setFollowing(res.following);
    } catch (e: any) {
      setFollowing((f) => !f);
      toast.error(e?.message ?? "Could not update follow");
    }
  };

  const onToggleLike = async (reviewId: string) => {
    if (!userId) { toast.error("Sign in to like"); return; }
    setReviews((rs) => rs.map((r) => r.id === reviewId
      ? { ...r, liked_by_me: !r.liked_by_me, like_count: r.like_count + (r.liked_by_me ? -1 : 1) }
      : r));
    try {
      await likeFn({ data: { review_id: reviewId } });
    } catch (e: any) {
      setReviews((rs) => rs.map((r) => r.id === reviewId
        ? { ...r, liked_by_me: !r.liked_by_me, like_count: r.like_count + (r.liked_by_me ? -1 : 1) }
        : r));
      toast.error(e?.message ?? "Could not like");
    }
  };

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

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: biz.name,
    description: biz.description ?? undefined,
    image: biz.hero_image_url ?? undefined,
    telephone: biz.phone ?? undefined,
    url: biz.website ?? `https://www.spott.ca/business/${biz.slug}`,
    address: (biz.address || biz.city || biz.province || biz.postal_code) ? {
      "@type": "PostalAddress",
      streetAddress: biz.address ?? undefined,
      addressLocality: biz.city ?? undefined,
      addressRegion: biz.province ?? undefined,
      postalCode: biz.postal_code ?? undefined,
      addressCountry: "CA",
    } : undefined,
    geo: (biz.latitude != null && biz.longitude != null) ? {
      "@type": "GeoCoordinates",
      latitude: Number(biz.latitude),
      longitude: Number(biz.longitude),
    } : undefined,
    aggregateRating: reviews.length ? {
      "@type": "AggregateRating",
      ratingValue: Number(avg.toFixed(1)),
      reviewCount: reviews.length,
    } : undefined,
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029") }} />
      <article className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <Link to="/browse" className="text-xs text-muted-foreground hover:text-foreground">← Browse</Link>

        <header className="mt-4 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">{biz.name}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
              {(biz.city || biz.province) && (
                <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {[biz.city, biz.province].filter(Boolean).join(", ")}</span>
              )}
              {biz.phone && <a href={`tel:${biz.phone}`} className="inline-flex items-center gap-1 hover:text-foreground"><Phone className="h-3.5 w-3.5" /> {biz.phone}</a>}
              {biz.email && <a href={`mailto:${biz.email}`} className="inline-flex items-center gap-1 hover:text-foreground"><Mail className="h-3.5 w-3.5" /> {biz.email}</a>}
              {biz.website && (
                <a href={biz.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-foreground">
                  <Globe className="h-3.5 w-3.5" /> Website
                </a>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="text-right">
              <div className="inline-flex items-center gap-1 text-2xl font-semibold">
                <Star className="h-5 w-5 fill-primary text-primary" />
                {reviews.length ? avg.toFixed(1) : "—"}
              </div>
              <div className="text-xs text-muted-foreground">{reviews.length} review{reviews.length === 1 ? "" : "s"}</div>
            </div>
            <div className="flex items-center gap-2">
              <ShareButton
                url={`/business/${biz.slug}`}
                title={biz.name}
                text={`Check out ${biz.name} on Spott.ca`}
              />
              <button
                onClick={onToggleFollow}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  following ? "border-primary/40 bg-primary/10 text-primary" : "border-border hover:bg-accent/10"
                }`}
              >
                {following ? <><UserCheck className="h-3.5 w-3.5" /> Following</> : <><UserPlus className="h-3.5 w-3.5" /> Follow</>}
              </button>
            </div>
          </div>
        </header>

        <div className="mt-6 flex flex-wrap gap-2">
          {biz.booking_url && (
            <a
              href={biz.booking_url}
              target="_blank"
              rel="noreferrer"
              onClick={() => {
                // Fire-and-forget click tracking; RLS allows anonymous inserts.
                supabase.from("booking_clicks").insert({ business_id: biz.id, user_id: userId }).then(() => {});
              }}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              <CalendarCheck className="h-4 w-4" /> {biz.booking_label || "Book now"}
            </a>
          )}
          {(biz.address || biz.latitude != null) && (
            <a
              href="#take-me-there"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById("take-me-there")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold hover:bg-accent/10"
            >
              <Car className="h-4 w-4" /> Take me there
            </a>
          )}
          <MessageOwnerButton businessId={biz.id} ownerId={biz.owner_id} userId={userId} />
        </div>

        {!biz.is_claimed && (
          <Link
            to="/claim/$slug"
            params={{ slug: biz.slug }}
            className="mt-6 flex items-center justify-between gap-4 rounded-xl border-2 border-primary/30 bg-gradient-to-r from-primary/10 to-primary/5 p-4 transition hover:border-primary/60"
          >
            <div>
              <div className="text-sm font-semibold text-primary">Is this your business?</div>
              <div className="text-xs text-muted-foreground">Claim it to manage your listing, reply to reviews, and accept bookings.</div>
            </div>
            <span className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground">Claim now →</span>
          </Link>
        )}

        {biz.status === "pending" && (
          <div className="mt-6 rounded-md border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-300">
            This listing is pending review.
          </div>
        )}

        {biz.hero_image_url && (
          <div className="mt-6 overflow-hidden rounded-2xl border border-border bg-secondary">
            <img src={biz.hero_image_url} alt={biz.name} className="aspect-[16/7] w-full object-cover" />
          </div>
        )}

        {biz.description && (
          <p className="mt-6 whitespace-pre-line text-[15px] leading-relaxed text-foreground/90">{biz.description}</p>
        )}

        <div className="mt-6 rounded-2xl border border-border bg-card p-4">
          <SocialShareBar
            url={`/business/${biz.slug}`}
            title={biz.name}
            text={`Check out this business on spott.ca: ${biz.name}${biz.description ? ` — ${biz.description.slice(0, 120)}` : ""}`}
          />
        </div>

        <OrderingPanel links={biz.ordering_links} businessName={biz.name} />


        {gallery.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 font-display text-lg font-semibold">Photos</h2>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
              {gallery.map((p) => {
                const url = supabase.storage.from("business-photos").getPublicUrl(p.storage_path).data.publicUrl;
                return (
                  <a key={p.id} href={url} target="_blank" rel="noreferrer"
                    className="block aspect-square overflow-hidden rounded-md border border-border bg-secondary">
                    <img src={url} alt="" loading="lazy" className="h-full w-full object-cover transition hover:scale-105" />
                  </a>
                );
              })}
            </div>
          </section>
        )}

        <TagsSection
          businessId={biz.id}
          initial={biz.keywords ?? []}
          canEdit={!!userId && userId === biz.owner_id}
          onSaved={(next) => setBiz((b) => (b ? { ...b, keywords: next } : b))}
        />

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
              onSaved={() => loadReviews(biz.id, userId)}
              onDeleted={() => loadReviews(biz.id, userId)}
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
                  <div className="flex items-center gap-2">
                    <AddFriendButton targetUserId={r.user_id} currentUserId={userId} />
                    <StarRow value={r.rating} />
                  </div>
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
                {r.owner_reply && (
                  <div className="mt-3 rounded-md border border-border/60 bg-background/60 p-3">
                    <div className="mb-1 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                      <MessageSquare className="h-3.5 w-3.5" /> Owner reply
                    </div>
                    <p className="text-sm">{r.owner_reply}</p>
                  </div>
                )}
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => onToggleLike(r.id)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition ${
                      r.liked_by_me ? "border-primary/40 bg-primary/10 text-primary" : "border-border hover:bg-accent/10"
                    }`}
                  >
                    <Heart className={`h-3.5 w-3.5 ${r.liked_by_me ? "fill-primary" : ""}`} /> {r.like_count}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <BusinessSpecials businessId={biz.id} />
        <div id="take-me-there" className="scroll-mt-20">
          <ClientOnly fallback={<div className="h-64 rounded-lg bg-muted" />}>
            <Suspense fallback={<div className="h-64 rounded-lg bg-muted" />}>
              <BusinessMap
                name={biz.name}
                address={biz.address}
                city={biz.city}
                province={biz.province}
                postalCode={biz.postal_code}
                latitude={biz.latitude != null ? Number(biz.latitude) : null}
                longitude={biz.longitude != null ? Number(biz.longitude) : null}
              />
            </Suspense>
          </ClientOnly>
        </div>


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

function TagsSection({
  businessId, initial, canEdit, onSaved,
}: {
  businessId: string;
  initial: string[];
  canEdit: boolean;
  onSaved: (next: string[]) => void;
}) {
  const save = useServerFn(updateBusinessKeywords);
  const fetchInfo = useServerFn(getBusinessTagInfo);
  const redeem = useServerFn(redeemCoupon);
  const { openCheckout, checkoutElement } = useStripeCheckout();

  const [tags, setTags] = useState<string[]>(initial);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [maxTags, setMaxTags] = useState(4);
  const [hasExtra, setHasExtra] = useState(false);
  const [extraUntil, setExtraUntil] = useState<string | null>(null);
  const [showRedeem, setShowRedeem] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [redeeming, setRedeeming] = useState(false);

  const refreshInfo = async () => {
    try {
      const info = await fetchInfo({ data: { business_id: businessId } });
      setMaxTags(info.max);
      setHasExtra(info.hasExtra);
      setExtraUntil(info.extraTagsUntil);
    } catch {}
  };

  useEffect(() => { setTags(initial); }, [initial]);
  useEffect(() => { if (canEdit) refreshInfo(); /* eslint-disable-next-line */ }, [canEdit, businessId]);

  if (!canEdit && tags.length === 0) return null;

  const beginEdit = () => { setDraft(tags.join(", ")); setEditing(true); };

  const commit = async () => {
    const next = Array.from(new Set(
      draft.split(",").map((t) => t.trim().toLowerCase()).filter((t) => t.length >= 2 && t.length <= 40),
    )).slice(0, maxTags);
    setSaving(true);
    try {
      const res = await save({ data: { business_id: businessId, keywords: next } });
      setTags(res.keywords);
      onSaved(res.keywords);
      setEditing(false);
      toast.success("Tags updated");
    } catch (e: any) {
      toast.error(e?.message || "Could not save tags");
    } finally {
      setSaving(false);
    }
  };

  const onRedeem = async () => {
    if (!couponCode.trim()) return;
    setRedeeming(true);
    try {
      await redeem({ data: { code: couponCode.trim(), business_id: businessId } });
      toast.success("Coupon redeemed!");
      setCouponCode("");
      setShowRedeem(false);
      refreshInfo();
    } catch (e: any) {
      toast.error(e?.message || "Invalid code");
    } finally {
      setRedeeming(false);
    }
  };

  const upgrade = (priceId: string) => {
    openCheckout({
      priceId,
      businessId,
      returnUrl: `${window.location.origin}/business/${window.location.pathname.split("/").pop()}?upgrade=success`,
    });
  };

  return (
    <section className="mt-6 rounded-xl border border-border bg-card/40 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Tag className="h-3.5 w-3.5" /> Tags
          {canEdit && (
            <span className="ml-1 text-[10px] text-muted-foreground/70">
              {tags.length}/{maxTags}{hasExtra && " (extras active)"}
            </span>
          )}
        </div>
        {canEdit && !editing && (
          <button onClick={beginEdit} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <Pencil className="h-3 w-3" /> Edit
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="comma, separated, tags (e.g. burgers, fries, breakfast)"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <p className="text-[11px] text-muted-foreground">
            Up to {maxTags} tags. Extra tags help customers find you in long-tail searches like "gluten-free brunch downtown" or "dog-friendly patio".
          </p>
          <div className="flex justify-end gap-2">
            <button onClick={() => setEditing(false)} className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
            <button
              onClick={commit}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />} Save
            </button>
          </div>
        </div>
      ) : tags.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <span key={t} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary">#{t}</span>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">No tags yet — add some so customers can find you.</p>
      )}

      {canEdit && !hasExtra && (
        <div className="mt-3 rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 text-xs">
          <p className="font-medium text-foreground">Need more tags? Get 8 extra (12 total)</p>
          <p className="mt-0.5 text-muted-foreground">
            Each tag opens another search path for customers. Long-tail searches drive the most committed visitors — they know what they want.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              onClick={() => upgrade("spott_extra_tags_yearly")}
              className="rounded-md bg-primary px-3 py-1.5 font-medium text-primary-foreground hover:bg-primary/90"
            >
              $3/mo (yearly — $36/yr)
            </button>
            <button
              onClick={() => upgrade("spott_extra_tags_monthly")}
              className="rounded-md border border-border bg-background px-3 py-1.5 font-medium hover:bg-muted"
            >
              $5/mo (monthly)
            </button>
            <button
              onClick={() => setShowRedeem((v) => !v)}
              className="ml-auto text-muted-foreground hover:text-foreground"
            >
              Have a code?
            </button>
          </div>
          {showRedeem && (
            <div className="mt-2 flex gap-2">
              <input
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                placeholder="COUPON CODE"
                className="flex-1 rounded-md border border-border bg-background px-2 py-1 font-mono text-xs"
              />
              <button
                onClick={onRedeem}
                disabled={redeeming}
                className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {redeeming ? <Loader2 className="h-3 w-3 animate-spin" /> : "Redeem"}
              </button>
            </div>
          )}
        </div>
      )}
      {canEdit && hasExtra && extraUntil && (
        <p className="mt-3 text-[11px] text-emerald-700 dark:text-emerald-400">
          Extra Tags active until {new Date(extraUntil).toLocaleDateString()}
        </p>
      )}
      {checkoutElement}
    </section>
  );
}

