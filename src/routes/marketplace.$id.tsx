import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { photoUrl, formatPrice, CONDITIONS, LISTING_TYPES } from "@/lib/marketplace";
import { useAuth } from "@/hooks/use-auth";
import { ArrowLeft, Heart, Mail, Phone, MapPin, Tag, Trash2, Loader2, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { ShareButton } from "@/components/ShareButton";
import { FollowUserButton } from "@/components/FollowUserButton";
import { MarketplaceChat } from "@/components/marketplace/MarketplaceChat";


export const Route = createFileRoute("/marketplace/$id")({
  component: ListingDetail,
});

type Listing = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  price_cents: number;
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
};

function ListingDetail() {
  const { id } = Route.useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [listing, setListing] = useState<Listing | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [seller, setSeller] = useState<{ display_name: string | null; avatar_url: string | null } | null>(null);
  const [categoryName, setCategoryName] = useState<string | null>(null);
  const [favorited, setFavorited] = useState(false);
  const [activePhoto, setActivePhoto] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);

  useEffect(() => {
    let cancel = false;
    async function load() {
      setLoading(true);
      const { data: l } = await supabase.from("marketplace_listings").select("*").eq("id", id).maybeSingle();
      if (cancel) return;
      if (!l) {
        setLoading(false);
        return;
      }
      setListing(l as Listing);
      const [{ data: ph }, { data: prof }, { data: cat }] = await Promise.all([
        supabase.from("marketplace_listing_photos").select("storage_path").eq("listing_id", id).order("sort_order"),
        supabase.from("profiles").select("display_name,avatar_url").eq("id", l.user_id).maybeSingle(),
        l.category_id
          ? supabase.from("marketplace_categories").select("name").eq("id", l.category_id).maybeSingle()
          : Promise.resolve({ data: null } as any),
      ]);
      if (cancel) return;
      setPhotos((ph ?? []).map((p: any) => p.storage_path));
      setSeller(prof ?? null);
      setCategoryName((cat as any)?.name ?? null);
      setLoading(false);
      // bump view count (best-effort)
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

  const toggleFav = async () => {
    if (!user) {
      toast.error("Sign in to save listings");
      navigate({ to: "/auth" });
      return;
    }
    if (!listing) return;
    if (favorited) {
      await supabase.from("marketplace_favorites").delete().eq("user_id", user.id).eq("listing_id", listing.id);
      setFavorited(false);
    } else {
      await supabase.from("marketplace_favorites").insert({ user_id: user.id, listing_id: listing.id });
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

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12">
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
  const mainPhoto = photos[activePhoto];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link to="/marketplace" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to marketplace
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* Photos */}
        <div>
          <div className="aspect-square overflow-hidden rounded-2xl border border-border bg-muted">
            {mainPhoto ? (
              <img src={photoUrl(mainPhoto)} alt={listing.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                <Tag className="h-12 w-12" />
              </div>
            )}
          </div>
          {photos.length > 1 && (
            <div className="mt-3 grid grid-cols-6 gap-2">
              {photos.map((p, i) => (
                <button
                  key={p}
                  onClick={() => setActivePhoto(i)}
                  className={`aspect-square overflow-hidden rounded-md border ${
                    i === activePhoto ? "border-primary" : "border-border"
                  }`}
                >
                  <img src={photoUrl(p)} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <div className="text-3xl font-bold tracking-tight">
            {formatPrice(listing.price_cents, listing.currency, listing.listing_type)}
          </div>
          <h1 className="mt-2 font-display text-2xl font-semibold">{listing.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="rounded-full border border-border bg-card px-2 py-1 text-muted-foreground">{typeLabel}</span>
            <span className="rounded-full border border-border bg-card px-2 py-1 text-muted-foreground">{conditionLabel}</span>
            {categoryName && (
              <span className="rounded-full border border-border bg-card px-2 py-1 text-muted-foreground">{categoryName}</span>
            )}
            {listing.status !== "active" && (
              <span className="rounded-full bg-amber-500/15 px-2 py-1 font-medium text-amber-600">{listing.status}</span>
            )}
          </div>
          {listing.city && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {listing.city}
              {listing.province ? `, ${listing.province}` : ""}
            </div>
          )}

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


          {/* Seller / contact card */}
          <div className="mt-6 rounded-2xl border border-border bg-card p-4">
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
        </div>
      </div>
    </div>
  );
}
