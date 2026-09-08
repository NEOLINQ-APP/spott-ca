import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { propertyPhotoUrl, PROPERTY_TYPES, LISTING_TYPES, propertyTypeLabel, fmtPropertyPrice, fmtBeds, fmtBaths } from "@/lib/realEstate";
import { Home, MapPin, PlusCircle, BedDouble, Bath } from "lucide-react";

export const Route = createFileRoute("/real-estate")({
  component: RealEstatePage,
  head: () => ({
    meta: [
      { title: "Real Estate — Spott" },
      { name: "description", content: "Homes, condos, land, and rentals for sale or rent across Canada." },
      { property: "og:title", content: "Real Estate — Spott" },
      { property: "og:description", content: "Browse and list real estate on Spott." },
    ],
    links: [{ rel: "canonical", href: "https://www.spott.ca/real-estate" }],
  }),
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

function RealEstatePage() {
  const [rows, setRows] = useState<PropertyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [listingType, setListingType] = useState("");
  const [city, setCity] = useState("");
  const [priceMax, setPriceMax] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      let query = supabase
        .from("properties")
        .select("id,title,property_type,listing_type,price_cents,bedrooms,bathrooms,city,province,approximate_location,property_photos(storage_path,sort_order)")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(60);
      if (propertyType) query = query.eq("property_type", propertyType);
      if (listingType) query = query.eq("listing_type", listingType);
      if (city) query = query.ilike("city", `%${city}%`);
      if (priceMax) query = query.lte("price_cents", Math.round(Number(priceMax) * 100));
      if (q) query = query.ilike("title", `%${q.replace(/[%_]/g, "\\$&")}%`);
      const { data } = await query;
      if (!cancelled) {
        setRows((data ?? []) as PropertyRow[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [q, propertyType, listingType, city, priceMax]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Real Estate</h1>
          <p className="text-sm text-muted-foreground">Homes, condos, land, and rentals across Canada.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/real-estate/favorites" className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted">
            Saved properties
          </Link>
          <Link to="/real-estate/new" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            <PlusCircle className="h-3.5 w-3.5" /> List a property
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-5">
        <input className="rounded-md border border-border bg-background p-2 text-sm sm:col-span-2" placeholder="Search title…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="rounded-md border border-border bg-background p-2 text-sm" value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
          <option value="">All types</option>
          {PROPERTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select className="rounded-md border border-border bg-background p-2 text-sm" value={listingType} onChange={(e) => setListingType(e.target.value)}>
          <option value="">Sale or rent</option>
          {LISTING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input className="rounded-md border border-border bg-background p-2 text-sm" placeholder="Max price" type="number" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} />
        <input className="rounded-md border border-border bg-background p-2 text-sm sm:col-span-5" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
      </div>

      {loading ? (
        <div className="mt-10 text-center text-sm text-muted-foreground">Loading properties…</div>
      ) : rows.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No properties match your search. <Link to="/real-estate/new" className="text-primary hover:underline">Be the first to list one</Link>.
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((p) => {
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
                    {p.bedrooms != null && <span className="inline-flex items-center gap-1"><BedDouble className="h-3 w-3" />{fmtBeds(p.bedrooms)}</span>}
                    {p.bathrooms != null && <span className="inline-flex items-center gap-1"><Bath className="h-3 w-3" />{fmtBaths(p.bathrooms)}</span>}
                  </div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {p.city ? `${p.city}${p.province ? ", " + p.province : ""}` : "Location on request"}
                    {p.approximate_location && <span className="text-[10px]">(approximate)</span>}
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
