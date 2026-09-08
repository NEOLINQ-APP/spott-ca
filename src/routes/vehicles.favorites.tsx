import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { photoUrl } from "@/lib/marketplace";
import { Heart, Car } from "lucide-react";

export const Route = createFileRoute("/vehicles/favorites")({
  component: VehicleFavoritesPage,
});

type Vehicle = {
  id: string;
  title: string;
  year: number | null;
  make: string | null;
  model: string | null;
  price_cents: number;
  currency: string;
  city: string | null;
  province: string | null;
};

function fmtPrice(cents: number, currency = "CAD") {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 0 }).format((cents || 0) / 100);
}

// Mirrors marketplace.favorites.tsx's exact shape/pattern — vehicles are a
// separate content type with their own detail route and card fields
// (year/make/model instead of listing_type), so this is a parallel page
// rather than folding vehicles into the marketplace-scoped one.
function VehicleFavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data: favs } = await supabase
        .from("vehicle_favorites")
        .select("vehicle_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      const ids = (favs ?? []).map((f: any) => f.vehicle_id);
      if (!ids.length) {
        setVehicles([]);
        setLoading(false);
        return;
      }
      const { data: vs } = await supabase
        .from("vehicles")
        .select("id,title,year,make,model,price_cents,currency,city,province")
        .in("id", ids);
      if (cancel) return;
      setVehicles((vs ?? []) as Vehicle[]);
      const { data: ph } = await supabase
        .from("vehicle_photos")
        .select("vehicle_id,storage_path,sort_order")
        .in("vehicle_id", ids)
        .order("sort_order");
      const map: Record<string, string> = {};
      (ph ?? []).forEach((p: any) => {
        if (!map[p.vehicle_id]) map[p.vehicle_id] = p.storage_path;
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
      <h1 className="font-display text-3xl font-semibold tracking-tight">Saved vehicles</h1>

      {loading ? (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-xl bg-card" />
          ))}
        </div>
      ) : vehicles.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center">
          <Heart className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">No saved vehicles yet.</p>
          <Link to="/vehicles/browse" className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Browse vehicles
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {vehicles.map((v) => {
            const heading = [v.year, v.make, v.model].filter(Boolean).join(" ") || v.title;
            return (
              <Link
                key={v.id}
                to="/vehicles/$id"
                params={{ id: v.id }}
                className="group overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/40"
              >
                <div className="aspect-square overflow-hidden bg-muted">
                  {photos[v.id] ? (
                    <img src={photoUrl(photos[v.id])} alt={heading} className="h-full w-full object-cover transition group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      <Car className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <div className="text-base font-semibold leading-tight">{fmtPrice(v.price_cents, v.currency)}</div>
                  <div className="mt-1 line-clamp-1 text-sm">{heading}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {v.city ? `${v.city}${v.province ? ", " + v.province : ""}` : "—"}
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
