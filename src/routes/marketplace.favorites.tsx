import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { photoUrl, formatPrice } from "@/lib/marketplace";
import { Heart, Tag } from "lucide-react";

export const Route = createFileRoute("/marketplace/favorites")({
  component: FavoritesPage,
});

type Listing = {
  id: string;
  title: string;
  price_cents: number;
  currency: string;
  city: string | null;
  province: string | null;
  listing_type: string;
};

function FavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [listings, setListings] = useState<Listing[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data: favs } = await supabase
        .from("marketplace_favorites")
        .select("listing_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      const ids = (favs ?? []).map((f: any) => f.listing_id);
      if (!ids.length) {
        setListings([]);
        setLoading(false);
        return;
      }
      const { data: ls } = await supabase
        .from("marketplace_listings")
        .select("id,title,price_cents,currency,city,province,listing_type")
        .in("id", ids);
      if (cancel) return;
      setListings((ls ?? []) as Listing[]);
      const { data: ph } = await supabase
        .from("marketplace_listing_photos")
        .select("listing_id,storage_path,sort_order")
        .in("listing_id", ids)
        .order("sort_order");
      const map: Record<string, string> = {};
      (ph ?? []).forEach((p: any) => {
        if (!map[p.listing_id]) map[p.listing_id] = p.storage_path;
      });
      setPhotos(map);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [user]);

  if (!authLoading && !user) {
    navigate({ to: "/auth" });
    return null;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Saved listings</h1>

      {loading ? (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-xl bg-card" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center">
          <Heart className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">No saved listings yet.</p>
          <Link to="/marketplace" className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Browse marketplace
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {listings.map((l) => (
            <Link
              key={l.id}
              to="/marketplace/$id"
              params={{ id: l.id }}
              className="group overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/40"
            >
              <div className="aspect-square overflow-hidden bg-muted">
                {photos[l.id] ? (
                  <img src={photoUrl(photos[l.id])} alt={l.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <Tag className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="text-base font-semibold leading-tight">
                  {formatPrice(l.price_cents, l.currency, l.listing_type)}
                </div>
                <div className="mt-1 line-clamp-1 text-sm">{l.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {l.city ? `${l.city}${l.province ? ", " + l.province : ""}` : "—"}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
