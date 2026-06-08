import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { photoUrl, formatPrice, CONDITIONS, LISTING_TYPES } from "@/lib/marketplace";
import { useAuth } from "@/hooks/use-auth";
import {
  ArrowLeft,
  Heart,
  Mail,
  Phone,
  MapPin,
  Tag,
  Trash2,
  Loader2,
  MessageCircle,
  ZoomIn,
  X,
  Play,
  CheckCircle2,
  Truck,
  Store,
  Clock,
  Star,
  ExternalLink,
  Share2,
  Copy,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { ShareButton } from "@/components/ShareButton";
import { FollowUserButton } from "@/components/FollowUserButton";
import { MarketplaceChat } from "@/components/marketplace/MarketplaceChat";

import { AuthGate } from "@/components/AuthGate";
import { MediaWatermark } from "@/components/MediaWatermark";

export const Route = createFileRoute("/marketplace/$id")({
  component: ListingDetailGated,
});

function ListingDetailGated() {
  const { id } = Route.useParams();
  return (
    <AuthGate
      redirectTo={`/marketplace/${id}`}
      title="Sign in to view this listing"
      description="Create a free account or sign in to see full details, photos, and contact the seller."
      backTo="/marketplace"
      backLabel="← Back to marketplace"
    >
      <ListingDetail />
    </AuthGate>
  );
}

type Listing = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  price_cents: number;
  compare_at_price_cents: number | null;
  commission_cents: number | null;
  currency: string;
  condition: string;
  listing_type: string;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  view_count: number;
  category_id: string | null;
  created_at: string;
  status: string;
  tags: string[] | null;
};

type Business = {
  id: string;
  name: string;
  slug: string;
  hero_image_url: string | null;
  status: string;
  city: string | null;
  province: string | null;
};

type Review = {
  id: string;
  rating: number;
  body: string;
  created_at: string;
  user_id: string;
  profiles?: { display_name: string | null; avatar_url: string | null } | null;
};

type Suggested = {
  id: string;
  title: string;
  price_cents: number;
  currency: string;
  listing_type: string;
  photo: string | null;
};

const VIDEO_EXT = /\.(mp4|webm|mov|m4v)$/i;

function isVideo(path: string) {
  return VIDEO_EXT.test(path);
}

function ListingDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();


  const [listing, setListing] = useState<Listing | null>(null);
  const [media, setMedia] = useState<string[]>([]);
  const [seller, setSeller] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [business, setBusiness] = useState<Business | null>(null);
  const [businessRating, setBusinessRating] = useState<{ avg: number; count: number } | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [suggested, setSuggested] = useState<Suggested[]>([]);
  const [favorited, setFavorited] = useState(false);
  const [active, setActive] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancel = false;
    async function load() {
      setLoading(true);
      const { data: l } = await supabase
        .from("marketplace_listings")
        .select("id,user_id,category_id,title,description,price_cents,compare_at_price_cents,commission_cents,currency,condition,listing_type,city,province,postal_code,latitude,longitude,status,view_count,created_at,updated_at,tags")
        .eq("id", id)
        .maybeSingle();
      if (cancel) return;
      if (!l) {
        setLoading(false);
        return;
      }
      setListing({ ...(l as any), contact_email: null, contact_phone: null } as Listing);

      // Contact PII is protected at the DB layer; fetch via SECURITY DEFINER RPC for signed-in users
      if (user) {
        const { data: contact } = await (supabase as any).rpc("get_listing_contact", { _listing_id: id });
        const row = Array.isArray(contact) ? contact[0] : contact;
        if (!cancel && row) {
          setListing((prev) => (prev ? { ...prev, contact_email: row.contact_email, contact_phone: row.contact_phone } : prev));
        }
      }

      const [{ data: ph }, { data: prof }, { data: cat }, { data: biz }] = await Promise.all([
        supabase
          .from("marketplace_listing_photos")
          .select("storage_path")
          .eq("listing_id", id)
          .order("sort_order"),
        supabase.from("profiles").select("display_name,avatar_url").eq("id", l.user_id).maybeSingle(),
        l.category_id
          ? supabase.from("marketplace_categories").select("name").eq("id", l.category_id).maybeSingle()
          : Promise.resolve({ data: null } as any),
        supabase
          .from("businesses")
          .select("id,name,slug,hero_image_url,status,city,province")
          .eq("owner_id", l.user_id)
          .eq("status", "approved")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (cancel) return;
      setMedia((ph ?? []).map((p: any) => p.storage_path));
      setSeller(prof ?? null);
      setCategoryName((cat as any)?.name ?? null);
      setBusiness((biz as Business) ?? null);

      if (biz?.id) {
        supabase
          .from("reviews")
          .select("id,rating,body,created_at,user_id")
          .eq("business_id", biz.id)
          .order("created_at", { ascending: false })
          .limit(6)
          .then(async ({ data }) => {
            if (cancel || !data) return;
            const count = data.length;
            const avg = count ? data.reduce((s: number, r: any) => s + (r.rating || 0), 0) / count : 0;
            setBusinessRating({ avg, count });
            const uids = Array.from(new Set(data.map((r: any) => r.user_id)));
            const { data: profs } = uids.length
              ? await supabase.from("profiles").select("id,display_name,avatar_url").in("id", uids)
              : { data: [] as any[] };
            const byId: Record<string, any> = {};
            (profs ?? []).forEach((p: any) => (byId[p.id] = p));
            if (!cancel) setReviews(data.map((r: any) => ({ ...r, profiles: byId[r.user_id] ?? null })));
          });
      }

      if (l.category_id) {
        supabase
          .from("marketplace_listings")
          .select("id,title,price_cents,currency,listing_type")
          .eq("category_id", l.category_id)
          .eq("status", "active")
          .neq("id", l.id)
          .order("created_at", { ascending: false })
          .limit(8)
          .then(async ({ data }) => {
            if (cancel || !data?.length) return;
            const ids = data.map((r: any) => r.id);
            const { data: pics } = await supabase
              .from("marketplace_listing_photos")
              .select("listing_id,storage_path")
              .in("listing_id", ids)
              .order("sort_order");
            const first: Record<string, string> = {};
            (pics ?? []).forEach((p: any) => {
              if (!first[p.listing_id]) first[p.listing_id] = p.storage_path;
            });
            setSuggested(
              data.map((r: any) => ({
                id: r.id,
                title: r.title,
                price_cents: r.price_cents,
                currency: r.currency,
                listing_type: r.listing_type,
                photo: first[r.id] ?? null,
              }))
            );
          });
      }

      setLoading(false);
      supabase
        .from("marketplace_listings")
        .update({ view_count: (l.view_count || 0) + 1 })
        .eq("id", id);
    }
    load();
    return () => {
      cancel = true;
    };
  }, [id]);

  useEffect(() => {
    if (!user || !listing) return;
    supabase
      .from("marketplace_favorites")
      .select("id")
      .eq("user_id", user.id)
      .eq("listing_id", listing.id)
      .maybeSingle()
      .then(({ data }) => setFavorited(!!data));
  }, [user, listing]);

  // Close zoom on Esc
  useEffect(() => {
    if (!zoomOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setZoomOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoomOpen]);

  const toggleFav = async () => {
    if (!user) {
      toast.error("Sign in to save listings");
      navigate({ to: "/auth" });
      return;
    }
    if (!listing) return;
    if (favorited) {
      await supabase
        .from("marketplace_favorites")
        .delete()
        .eq("user_id", user.id)
        .eq("listing_id", listing.id);
      setFavorited(false);
    } else {
      await supabase
        .from("marketplace_favorites")
        .insert({ user_id: user.id, listing_id: listing.id });
      setFavorited(true);
    }
  };

  const removeListing = async () => {
    if (!listing || !confirm("Delete this listing permanently?")) return;
    setDeleting(true);
    const { error } = await supabase.from("marketplace_listings").delete().eq("id", listing.id);
    setDeleting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Listing deleted");
    navigate({ to: "/marketplace/my-listings" });
  };

  const tags = listing?.tags ?? [];
  const hasDelivery = tags.some((t) => /delivery|ship/i.test(t));
  const hasPickup = tags.some((t) => /pickup|local/i.test(t));
  const discountPct = useMemo(() => {
    if (!listing?.compare_at_price_cents || listing.compare_at_price_cents <= listing.price_cents) return 0;
    return Math.round(
      ((listing.compare_at_price_cents - listing.price_cents) / listing.compare_at_price_cents) * 100
    );
  }, [listing]);

  const affiliateLink = useMemo(() => {
    if (typeof window === "undefined" || !listing) return "";
    const base = `${window.location.origin}/marketplace/${listing.id}`;
    return user ? `${base}?ref=${user.id}` : base;
  }, [listing, user]);

  const copyAffiliate = async () => {
    if (!user) {
      toast.error("Sign in to generate your affiliate link");
      navigate({ to: "/auth" });
      return;
    }
    try {
      await navigator.clipboard.writeText(affiliateLink);
      setCopied(true);
      toast.success("Affiliate link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy link");
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="h-96 animate-pulse rounded-2xl bg-card" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">Listing not found</h1>
        <Link to="/marketplace" className="mt-4 inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to marketplace
        </Link>
      </div>
    );
  }

  const isOwner = user?.id === listing.user_id;
  const conditionLabel = CONDITIONS.find((c) => c.value === listing.condition)?.label ?? listing.condition;
  const typeLabel = LISTING_TYPES.find((t) => t.value === listing.listing_type)?.label ?? listing.listing_type;
  const mainMedia = media[active];
  const inStock = listing.status === "active";

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <Link to="/marketplace" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to marketplace
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* Gallery */}
        <div>
          <div className="group relative aspect-square overflow-hidden rounded-2xl border border-border bg-muted">
            {mainMedia ? (
              isVideo(mainMedia) ? (
                <video src={photoUrl(mainMedia)} controls className="h-full w-full object-cover" />
              ) : (
                <>
                  <img
                    src={photoUrl(mainMedia)}
                    alt={listing.title}
                    className="h-full w-full cursor-zoom-in object-cover transition-transform duration-300 group-hover:scale-105"
                    onClick={() => setZoomOpen(true)}
                  />
                  <button
                    onClick={() => setZoomOpen(true)}
                    className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-background/80 px-3 py-1.5 text-xs font-medium backdrop-blur hover:bg-background"
                  >
                    <ZoomIn className="h-3.5 w-3.5" /> Zoom
                  </button>
                </>
              )
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <Tag className="h-12 w-12" />
              </div>
            )}
            {discountPct > 0 && (
              <div className="absolute left-3 top-3 rounded-full bg-red-500 px-2.5 py-1 text-xs font-bold text-white">
                -{discountPct}%
              </div>
            )}
          </div>

          {media.length > 1 && (
            <div className="mt-3 grid grid-cols-6 gap-2">
              {media.map((p, i) => (
                <button
                  key={p}
                  onClick={() => setActive(i)}
                  className={`relative aspect-square overflow-hidden rounded-md border ${
                    i === active ? "border-primary" : "border-border"
                  }`}
                >
                  {isVideo(p) ? (
                    <div className="flex h-full w-full items-center justify-center bg-black/80">
                      <Play className="h-5 w-5 text-white" />
                    </div>
                  ) : (
                    <img src={photoUrl(p)} alt={`Media ${i + 1}`} className="h-full w-full object-cover" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <div className="flex items-baseline gap-3">
            <div className="text-3xl font-bold tracking-tight">
              {formatPrice(listing.price_cents, listing.currency, listing.listing_type)}
            </div>
            {listing.compare_at_price_cents && listing.compare_at_price_cents > listing.price_cents && (
              <div className="text-lg text-muted-foreground line-through">
                {formatPrice(listing.compare_at_price_cents, listing.currency)}
              </div>
            )}
            {discountPct > 0 && (
              <span className="rounded bg-red-500/15 px-2 py-0.5 text-xs font-semibold text-red-600">
                Save {discountPct}%
              </span>
            )}
          </div>

          <h1 className="mt-2 font-display text-2xl font-semibold">{listing.title}</h1>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-border bg-card px-2 py-1 text-muted-foreground">{typeLabel}</span>
            <span className="rounded-full border border-border bg-card px-2 py-1 text-muted-foreground">{conditionLabel}</span>
            {categoryName && (
              <span className="rounded-full border border-border bg-card px-2 py-1 text-muted-foreground">{categoryName}</span>
            )}
          </div>

          {/* Stock + delivery */}
          <div className="mt-4 space-y-2 rounded-xl border border-border bg-card p-3 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle2 className={`h-4 w-4 ${inStock ? "text-green-600" : "text-muted-foreground"}`} />
              <span className={inStock ? "font-medium text-green-700 dark:text-green-500" : "text-muted-foreground"}>
                {inStock ? "In stock & available" : listing.status}
              </span>
            </div>
            {hasDelivery && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Truck className="h-4 w-4" /> Delivery available
              </div>
            )}
            {hasPickup && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Store className="h-4 w-4" /> Local pickup
                {listing.city ? ` in ${listing.city}` : ""}
              </div>
            )}
            {(hasDelivery || hasPickup) && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="h-4 w-4" /> Est. delivery 2–5 business days
              </div>
            )}
            {listing.city && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {listing.city}
                {listing.province ? `, ${listing.province}` : ""}
              </div>
            )}
          </div>

          {listing.description && (
            <p className="mt-5 whitespace-pre-wrap text-sm text-foreground/90">{listing.description}</p>
          )}

          <div className="mt-6 flex flex-wrap gap-2">
            {!isOwner && (
              <>
                <button
                  onClick={() => {
                    if (!user) {
                      toast.error("Sign in to message seller");
                      navigate({ to: "/auth" });
                      return;
                    }
                    setChatOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <MessageCircle className="h-4 w-4" /> Message seller
                </button>
                <button
                  onClick={toggleFav}
                  className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm hover:bg-accent/10"
                >
                  <Heart className={`h-4 w-4 ${favorited ? "fill-red-500 text-red-500" : ""}`} />
                  {favorited ? "Saved" : "Save"}
                </button>
              </>
            )}
            <ShareButton
              url={`/marketplace/${listing.id}`}
              title={listing.title}
              text={`Check out "${listing.title}" on Spott Marketplace`}
              className="px-4 py-2 text-sm"
            />
            {isOwner && (
              <button
                onClick={removeListing}
                disabled={deleting}
                className="inline-flex items-center gap-1.5 rounded-md border border-destructive/50 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-60"
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete listing
              </button>
            )}
          </div>

          {/* Business card */}
          <div className="mt-6 rounded-2xl border border-border bg-card p-4">
            {business ? (
              <div>
                <div className="flex items-center gap-3">
                  {business.hero_image_url ? (
                    <img src={business.hero_image_url} alt="" className="h-12 w-12 rounded-lg object-cover" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/15 text-base font-semibold text-primary">
                      {business.name.slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold">{business.name}</span>
                      <CheckCircle2 className="h-4 w-4 text-blue-500" aria-label="Verified" />
                    </div>
                    {businessRating && businessRating.count > 0 && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                        {businessRating.avg.toFixed(1)} · {businessRating.count} review
                        {businessRating.count === 1 ? "" : "s"}
                      </div>
                    )}
                    {(business.city || business.province) && (
                      <div className="text-xs text-muted-foreground">
                        {[business.city, business.province].filter(Boolean).join(", ")}
                      </div>
                    )}
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    to="/business/$slug"
                    params={{ slug: business.slug }}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    <Store className="h-3.5 w-3.5" /> Visit store
                  </Link>
                  {!isOwner && (
                    <button
                      onClick={() => {
                        if (!user) {
                          toast.error("Sign in to contact");
                          navigate({ to: "/auth" });
                          return;
                        }
                        setChatOpen(true);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent/10"
                    >
                      <MessageCircle className="h-3.5 w-3.5" /> Contact
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                {seller?.avatar_url ? (
                  <img src={seller.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                    {(seller?.display_name ?? "S").slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <div className="text-sm font-medium">{seller?.display_name ?? "Seller"}</div>
                  <div className="text-xs text-muted-foreground">
                    Posted {new Date(listing.created_at).toLocaleDateString()}
                  </div>
                </div>
                <FollowUserButton targetUserId={listing.user_id} meId={user?.id ?? null} />
              </div>
            )}
            {!isOwner && (listing.contact_email || listing.contact_phone) && (
              <div className="mt-4 flex flex-col gap-2">
                {listing.contact_email && (
                  <a
                    href={`mailto:${listing.contact_email}?subject=${encodeURIComponent("Spott Marketplace: " + listing.title)}`}
                    className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    <Mail className="h-4 w-4" /> Email seller
                  </a>
                )}
                {listing.contact_phone && (
                  <a
                    href={`tel:${listing.contact_phone}`}
                    className="inline-flex items-center justify-center gap-2 rounded-md border border-border px-4 py-2 text-sm hover:bg-accent/10"
                  >
                    <Phone className="h-4 w-4" /> {listing.contact_phone}
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Promoter / Share & Earn */}
          {listing.commission_cents && listing.commission_cents > 0 ? (
            <div className="mt-6 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 to-orange-500/5 p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-amber-600" />
                <h3 className="font-semibold">Share & earn</h3>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Earn{" "}
                <span className="font-semibold text-foreground">
                  {formatPrice(listing.commission_cents, listing.currency)}
                </span>{" "}
                per sale when someone buys through your link.
              </p>
              <div className="mt-3 rounded-md border border-border bg-background p-2 text-xs">
                <div className="text-muted-foreground">Your affiliate link</div>
                <div className="mt-1 truncate font-mono text-xs">{affiliateLink || "Sign in to generate"}</div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-md bg-card p-2">
                  <div className="text-muted-foreground">Sale price</div>
                  <div className="font-semibold">{formatPrice(listing.price_cents, listing.currency)}</div>
                </div>
                <div className="rounded-md bg-card p-2">
                  <div className="text-muted-foreground">Your commission</div>
                  <div className="font-semibold text-amber-600">
                    {formatPrice(listing.commission_cents, listing.currency)}
                  </div>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={copyAffiliate}
                  className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-amber-500 px-3 py-2 text-sm font-medium text-white hover:bg-amber-600"
                >
                  {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? "Copied" : "Copy link"}
                </button>
                <ShareButton
                  url={affiliateLink || `/marketplace/${listing.id}`}
                  title={listing.title}
                  text={`Check out "${listing.title}" on Spott`}
                  className="px-3 py-2 text-sm"
                />
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Reviews */}
      <section className="mt-12">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold">Reviews</h2>
          {businessRating && businessRating.count > 0 && (
            <div className="flex items-center gap-1 text-sm">
              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              <span className="font-semibold">{businessRating.avg.toFixed(1)}</span>
              <span className="text-muted-foreground">({businessRating.count})</span>
            </div>
          )}
        </div>
        {reviews.length === 0 ? (
          <div className="mt-4 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No reviews yet. Be the first to share your experience.
          </div>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {reviews.map((r) => (
              <div key={r.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center gap-2">
                  {r.profiles?.avatar_url ? (
                    <img src={r.profiles.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                      {(r.profiles?.display_name ?? "U").slice(0, 1).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium">{r.profiles?.display_name ?? "Customer"}</span>
                      <span
                        className="inline-flex items-center gap-0.5 rounded-full bg-green-500/15 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:text-green-500"
                        title="Verified purchase"
                      >
                        <CheckCircle2 className="h-3 w-3" /> Verified
                      </span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-3.5 w-3.5 ${
                            i < r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="mt-2 text-sm text-foreground/90">{r.body}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Suggested products */}
      {suggested.length > 0 && (
        <section className="mt-12">
          <h2 className="font-display text-xl font-semibold">You might also like</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {suggested.slice(0, 4).map((s) => (
              <Link
                key={s.id}
                to="/marketplace/$id"
                params={{ id: s.id }}
                className="group overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/50"
              >
                <div className="aspect-square overflow-hidden bg-muted">
                  {s.photo ? (
                    <img
                      src={photoUrl(s.photo)}
                      alt={s.title}
                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <Tag className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <div className="line-clamp-2 text-sm font-medium">{s.title}</div>
                  <div className="mt-1 text-sm font-semibold text-primary">
                    {formatPrice(s.price_cents, s.currency, s.listing_type)}
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {suggested.length >= 2 && (
            <div className="mt-8 rounded-2xl border border-border bg-card p-4">
              <h3 className="font-semibold">Frequently bought together</h3>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-16 w-16 overflow-hidden rounded-md bg-muted">
                    {mainMedia && !isVideo(mainMedia) ? (
                      <img src={photoUrl(mainMedia)} alt="" className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <span className="text-xl text-muted-foreground">+</span>
                  {suggested.slice(0, 2).map((s, i) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <Link to="/marketplace/$id" params={{ id: s.id }} className="h-16 w-16 overflow-hidden rounded-md bg-muted">
                        {s.photo ? (
                          <img src={photoUrl(s.photo)} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </Link>
                      {i < 1 && suggested.length > 1 && <span className="text-xl text-muted-foreground">+</span>}
                    </div>
                  ))}
                </div>
                <div className="ml-auto text-right">
                  <div className="text-xs text-muted-foreground">Bundle total</div>
                  <div className="text-lg font-semibold">
                    {formatPrice(
                      listing.price_cents +
                        suggested.slice(0, 2).reduce((s, x) => s + (x.price_cents || 0), 0),
                      listing.currency
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* Zoom lightbox */}
      {zoomOpen && mainMedia && !isVideo(mainMedia) && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
          onClick={() => setZoomOpen(false)}
        >
          <button
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            onClick={() => setZoomOpen(false)}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={photoUrl(mainMedia)}
            alt={listing.title}
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {chatOpen && user && (
        <MarketplaceChat
          listingId={listing.id}
          sellerId={listing.user_id}
          meId={user.id}
          listingTitle={listing.title}
          onClose={() => setChatOpen(false)}
        />
      )}
    </div>
  );
}
