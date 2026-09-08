import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { propertyPhotoUrl, propertyTypeLabel, fmtPropertyPrice, fmtBeds, fmtBaths } from "@/lib/realEstate";
import { Heart, Home, MapPin } from "lucide-react";

export const Route = createFileRoute("/real-estate/favorites")({
  component: PropertyFavoritesPage,
});

type PropertyRow = {
  id: string;
  title: string;
  property_type: string;
  listing_type: string;
  price_cents: number;
  bedrooms: number | null;
  bathrooms: number | null;
  city: string | null;
  province: string | null;
  approximate_location: boolean;
  property_photos: Array<{ storage_path: string; sort_order: number }>;
};

function PropertyFavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data: favs } = await supabase
        .from("property_favorites")
        .select("property_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      const ids = (favs ?? []).map((f: any) => f.property_id);
      if (!ids.length) {
        setProperties([]);
        setLoading(false);
        return;
      }
      const { data: ps } = await supabase
        .from("properties")
        .select("id,title,property_type,listing_type,price_cents,bedrooms,bathrooms,city,province,approximate_location,property_photos(storage_path,sort_order)")
        .in("id", ids);
      if (!cancel) setProperties((ps ?? []) as PropertyRow[]);
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
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Saved properties</h1>

      {loading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-56 animate-pulse rounded-xl bg-card" />)}
        </div>
      ) : properties.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center">
          <Heart className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">No saved properties yet.</p>
          <Link to="/real-estate" className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Browse real estate
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((p) => {
            const cover = p.property_photos.slice().sort((a, b) => a.sort_order - b.sort_order)[0];
            return (
              <Link key={p.id} to="/real-estate/$id" params={{ id: p.id }} className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/40">
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  {cover ? (
                    <img src={propertyPhotoUrl(cover.storage_path)} alt={p.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground"><Home className="h-10 w-10" /></div>
                  )}
                  <span className="absolute left-2 top-2 inline-flex items-center rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide backdrop-blur">
                    {propertyTypeLabel(p.property_type)}
                  </span>
                </div>
                <div className="p-3">
                  <div className="text-base font-bold">{fmtPropertyPrice(p.price_cents, p.listing_type)}</div>
                  <div className="mt-1 line-clamp-1 text-sm font-medium text-foreground">{p.title}</div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    {p.bedrooms != null && <span>{fmtBeds(p.bedrooms)}</span>}
                    {p.bathrooms != null && <span>{fmtBaths(p.bathrooms)}</span>}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {p.city ? `${p.city}${p.province ? ", " + p.province : ""}` : "Location on request"}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
