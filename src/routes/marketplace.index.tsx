import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { photoUrl, formatPrice } from "@/lib/marketplace";
import { Search, MapPin, Heart, Plus, Tag } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

type Listing = {
  id: string;
  title: string;
  price_cents: number;
  currency: string;
  city: string | null;
  province: string | null;
  listing_type: string;
  condition: string;
  category_id: string | null;
  created_at: string;
};

type Cat = { id: string; slug: string; name: string };

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  city: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/marketplace/")({
  component: MarketplaceBrowse,
  validateSearch: zodValidator(searchSchema),
});

function MarketplaceBrowse() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [cats, setCats] = useState<Cat[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState<string>("");
  const [city, setCity] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [type, setType] = useState<string>("");

  useEffect(() => {
    supabase
      .from("marketplace_categories")
      .select("id,slug,name")
      .order("sort_order")
      .then(({ data }) => data && setCats(data));
  }, []);

  useEffect(() => {
    let cancel = false;
    async function load() {
      setLoading(true);
      let query = supabase
        .from("marketplace_listings")
        .select("id,title,price_cents,currency,city,province,listing_type,condition,category_id,created_at")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(60);
      if (category) query = query.eq("category_id", category);
      if (city.trim()) query = query.ilike("city", `%${city.trim()}%`);
      if (q.trim()) query = query.ilike("title", `%${q.trim()}%`);
      if (type) query = query.eq("listing_type", type);
      if (minPrice) query = query.gte("price_cents", Math.round(Number(minPrice) * 100));
      if (maxPrice) query = query.lte("price_cents", Math.round(Number(maxPrice) * 100));
      const { data } = await query;
      if (cancel) return;
      const rows = (data ?? []) as Listing[];
      setListings(rows);
      // load first photo per listing
      if (rows.length) {
        const ids = rows.map((r) => r.id);
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
      } else {
        setPhotos({});
      }
      setLoading(false);
    }
    load();
    return () => {
      cancel = true;
    };
  }, [q, category, city, type, minPrice, maxPrice]);

  useEffect(() => {
    if (!user) {
      setFavs(new Set());
      return;
    }
    supabase
      .from("marketplace_favorites")
      .select("listing_id")
      .eq("user_id", user.id)
      .then(({ data }) => setFavs(new Set((data ?? []).map((r: any) => r.listing_id))));
  }, [user]);

  const toggleFav = async (id: string) => {
    if (!user) {
      toast.error("Sign in to save listings");
      navigate({ to: "/auth" });
      return;
    }
    if (favs.has(id)) {
      await supabase.from("marketplace_favorites").delete().eq("user_id", user.id).eq("listing_id", id);
      setFavs((s) => {
        const n = new Set(s);
        n.delete(id);
        return n;
      });
    } else {
      await supabase.from("marketplace_favorites").insert({ user_id: user.id, listing_id: id });
      setFavs((s) => new Set(s).add(id));
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Search bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/60 p-3 backdrop-blur sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2 px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search listings…"
            className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex items-center gap-2 px-3 sm:border-l sm:border-border">
          <MapPin className="h-4 w-4 text-muted-foreground" />
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="City"
            className="w-40 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <Link
          to="/marketplace/new"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Post a listing
        </Link>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* Sidebar filters */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card/60 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categories</h3>
            <ul className="mt-3 space-y-1 text-sm">
              <li>
                <button
                  onClick={() => setCategory("")}
                  className={`block w-full rounded-md px-2 py-1.5 text-left hover:bg-accent/10 ${
                    !category ? "bg-accent/10 text-foreground font-medium" : "text-muted-foreground"
                  }`}
                >
                  All categories
                </button>
              </li>
              {cats.map((c) => (
                <li key={c.id}>
                  <button
                    onClick={() => setCategory(c.id)}
                    className={`block w-full rounded-md px-2 py-1.5 text-left hover:bg-accent/10 ${
                      category === c.id ? "bg-accent/10 text-foreground font-medium" : "text-muted-foreground"
                    }`}
                  >
                    {c.name}
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-card/60 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Price (CAD)</h3>
            <div className="mt-3 flex items-center gap-2">
              <input
                value={minPrice}
                onChange={(e) => setMinPrice(e.target.value)}
                placeholder="Min"
                inputMode="numeric"
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.target.value)}
                placeholder="Max"
                inputMode="numeric"
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm"
              />
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card/60 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</h3>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              {[
                { v: "", l: "All" },
                { v: "sale", l: "Sale" },
                { v: "trade", l: "Trade" },
                { v: "free", l: "Free" },
                { v: "wanted", l: "Wanted" },
              ].map((t) => (
                <button
                  key={t.v || "all"}
                  onClick={() => setType(t.v)}
                  className={`rounded-md border px-2 py-1.5 ${
                    type === t.v
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:bg-accent/10"
                  }`}
                >
                  {t.l}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Grid */}
        <section>
          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-xl bg-card" />
              ))}
            </div>
          ) : listings.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border p-12 text-center">
              <Tag className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-4 text-sm text-muted-foreground">No listings match your filters yet.</p>
              <Link
                to="/marketplace/new"
                className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="h-4 w-4" /> Be the first to post
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {listings.map((l) => (
                <div key={l.id} className="group relative overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/40">
                  <Link to="/marketplace/$id" params={{ id: l.id }} className="block">
                    <div className="aspect-square overflow-hidden bg-muted">
                      {photos[l.id] ? (
                        <img
                          src={photoUrl(photos[l.id])}
                          alt={l.title}
                          loading="lazy"
                          className="h-full w-full object-cover transition group-hover:scale-105"
                        />
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
                      <div className="mt-1 line-clamp-1 text-sm text-foreground">{l.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {l.city ? `${l.city}${l.province ? ", " + l.province : ""}` : "—"}
                      </div>
                    </div>
                  </Link>
                  <button
                    onClick={() => toggleFav(l.id)}
                    aria-label={favs.has(l.id) ? "Remove from saved" : "Save listing"}
                    className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-background/80 backdrop-blur transition hover:bg-background"
                  >
                    <Heart className={`h-4 w-4 ${favs.has(l.id) ? "fill-red-500 text-red-500" : "text-foreground"}`} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
