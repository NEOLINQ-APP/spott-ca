import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Search, MapPin, Plus, Tag, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { PROVINCES, searchCities, CITIES_BY_PROVINCE } from "@/lib/canada";
import { Combobox } from "@/components/ui/combobox";
import { bestSuggestion } from "@/lib/fuzzy";
import { MarketplaceCard, type CardListing } from "@/components/marketplace/MarketplaceCard";
import { MarketplaceRightSidebar } from "@/components/marketplace/sidebar/MarketplaceRightSidebar";

type Listing = CardListing & {
  user_id?: string;
  category_id: string | null;
  created_at: string;
  condition: string;
};

type Cat = { id: string; slug: string; name: string };

const PAGE_SIZE = 20;

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  city: fallback(z.string(), "").default(""),
  page: fallback(z.coerce.number().min(1), 1).default(1),
});

export const Route = createFileRoute("/marketplace/")({
  component: MarketplaceBrowse,
  validateSearch: zodValidator(searchSchema),
});

function MarketplaceBrowse() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const initial = Route.useSearch();
  const [cats, setCats] = useState<Cat[]>([]);
  const [listings, setListings] = useState<Listing[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [q, setQ] = useState(initial.q ?? "");
  const [category, setCategory] = useState<string>("");
  const [city, setCity] = useState(initial.city ?? "");
  const [province, setProvince] = useState<string>("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [type, setType] = useState<string>("");
  const [delivery, setDelivery] = useState<string>(""); // "", "delivery", "pickup"
  const [minRating, setMinRating] = useState<number>(0);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [dealsOnly, setDealsOnly] = useState(false);
  const [trending, setTrending] = useState(false);
  const [maxDistanceKm, setMaxDistanceKm] = useState<number>(0); // 0 = any
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);

  // Autocomplete state
  const [suggestions, setSuggestions] = useState<{ value: string; label: string; sub?: string }[]>([]);
  const [vocab, setVocab] = useState<string[]>([]); // for spell-suggest
  const suggestTimer = useRef<number | null>(null);

  const page = Math.max(1, initial.page ?? 1);

  // Reset page on filter change
  useEffect(() => {
    if (page > 1) navigate({ to: "/marketplace", search: { ...initial, page: 1 } as any });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category, type, minPrice, maxPrice, province, delivery, minRating, verifiedOnly, dealsOnly, trending, maxDistanceKm]);

  useEffect(() => {
    supabase
      .from("marketplace_categories")
      .select("id,slug,name")
      .order("sort_order")
      .then(({ data }) => data && setCats(data));
  }, []);

  // Build a local vocab for spell-suggest: titles + tags of the latest 200 listings
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("marketplace_listings")
        .select("title,tags")
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(200);
      const words = new Set<string>();
      (data ?? []).forEach((r: any) => {
        (r.title || "")
          .toLowerCase()
          .split(/[^a-z0-9]+/)
          .filter((w: string) => w.length >= 4)
          .forEach((w: string) => words.add(w));
        (r.tags || []).forEach((t: string) => t && words.add(t.toLowerCase()));
      });
      setVocab(Array.from(words));
    })();
  }, []);

  // Debounced live search suggestions (titles + tags)
  useEffect(() => {
    if (suggestTimer.current) window.clearTimeout(suggestTimer.current);
    const term = q.trim();
    if (term.length < 2) {
      setSuggestions([]);
      return;
    }
    suggestTimer.current = window.setTimeout(async () => {
      const { data } = await supabase
        .from("marketplace_listings")
        .select("title,tags")
        .eq("status", "active")
        .or(`title.ilike.%${term}%,tags.cs.{${term.toLowerCase()}}`)
        .limit(20);
      const tlc = term.toLowerCase();
      const seen = new Set<string>();
      const items: { value: string; label: string; sub?: string }[] = [];
      (data ?? []).forEach((r: any) => {
        if (r.title && r.title.toLowerCase().includes(tlc)) {
          const k = "t:" + r.title.toLowerCase();
          if (!seen.has(k)) {
            seen.add(k);
            items.push({ value: r.title, label: r.title, sub: "listing" });
          }
        }
        (r.tags || []).forEach((t: string) => {
          if (t && t.includes(tlc)) {
            const k = "g:" + t;
            if (!seen.has(k)) {
              seen.add(k);
              items.push({ value: t, label: `#${t}`, sub: "tag" });
            }
          }
        });
      });
      setSuggestions(items.slice(0, 8));
    }, 180);
  }, [q]);

  useEffect(() => {
    let cancel = false;
    async function load() {
      setLoading(true);
      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let query = supabase
        .from("marketplace_listings")
        .select(
          "id,title,price_cents,compare_at_price_cents,commission_cents,currency,city,province,listing_type,condition,category_id,created_at,tags,view_count,latitude,longitude,user_id",
          { count: "exact" }
        )
        .eq("status", "active")
        .order(trending ? "view_count" : "created_at", { ascending: false })
        .range(from, to);

      if (category) query = query.eq("category_id", category);
      if (province) query = query.eq("province", province);
      if (city.trim()) query = query.ilike("city", `%${city.trim()}%`);
      if (q.trim()) {
        const term = q.trim();
        const tlc = term.toLowerCase();
        query = query.or(
          `title.ilike.%${term}%,description.ilike.%${term}%,tags.cs.{${tlc}}`
        );
      }
      if (type) query = query.eq("listing_type", type);
      if (minPrice) query = query.gte("price_cents", Math.round(Number(minPrice) * 100));
      if (maxPrice) query = query.lte("price_cents", Math.round(Number(maxPrice) * 100));
      if (delivery) query = (query as any).contains("tags", [delivery]);
      if (verifiedOnly) query = (query as any).contains("tags", ["verified"]);
      if (dealsOnly) query = (query as any).contains("tags", ["deal"]);

      // Rough bounding box for distance
      if (maxDistanceKm > 0 && userLoc) {
        const dLat = maxDistanceKm / 111;
        const dLng = maxDistanceKm / (111 * Math.cos((userLoc.lat * Math.PI) / 180));
        query = query
          .gte("latitude", userLoc.lat - dLat)
          .lte("latitude", userLoc.lat + dLat)
          .gte("longitude", userLoc.lng - dLng)
          .lte("longitude", userLoc.lng + dLng);
      }

      const { data, count } = await query;
      if (cancel) return;
      const rows = (data ?? []) as Listing[];

      // Enrich each listing with the seller's approved business name (if any)
      const sellerIds = Array.from(new Set(rows.map((r) => r.user_id).filter(Boolean))) as string[];
      let bizByOwner: Record<string, string> = {};
      if (sellerIds.length) {
        const { data: biz } = await supabase
          .from("businesses")
          .select("owner_id,name")
          .in("owner_id", sellerIds)
          .eq("status", "approved");
        (biz ?? []).forEach((b: any) => {
          if (b.owner_id && !bizByOwner[b.owner_id]) bizByOwner[b.owner_id] = b.name;
        });
      }
      const enriched: Listing[] = rows.map((r) => ({
        ...r,
        business_name: r.user_id ? bizByOwner[r.user_id] ?? null : null,
        verified: r.user_id ? Boolean(bizByOwner[r.user_id]) : false,
      }));

      setListings(enriched);
      setTotalCount(count ?? 0);
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
  }, [q, category, city, province, type, minPrice, maxPrice, page, delivery, verifiedOnly, dealsOnly, trending, maxDistanceKm, userLoc]);

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

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const canPrev = page > 1;
  const canNext = page < totalPages;
  const goPage = (p: number) => navigate({ to: "/marketplace", search: { ...initial, page: p } as any });

  const cityItems = useMemo(() => {
    const pool = city.trim()
      ? searchCities(city, 8)
      : (province ? (CITIES_BY_PROVINCE[province] || []).slice(0, 8).map((c) => ({ city: c, province })) : []);
    return pool.map((c) => ({ value: c.city, label: c.city, sub: c.province }));
  }, [city, province]);

  // "Did you mean?" — only when we have a real query and zero results
  const didYouMean = useMemo(() => {
    if (loading) return null;
    if (totalCount > 0) return null;
    const term = q.trim();
    if (term.length < 3) return null;
    return bestSuggestion(term, vocab);
  }, [q, vocab, totalCount, loading]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Search bar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card/60 p-3 backdrop-blur sm:flex-row sm:items-center">
        <Combobox
          value={q}
          onChange={setQ}
          onPick={(it) => setQ(it.value)}
          items={suggestions}
          placeholder="Search listings or #tags…"
          icon={<Search className="h-4 w-4 text-muted-foreground" />}
          inputClassName="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
          containerClassName="flex-1 px-3"
        />
        <Combobox
          value={city}
          onChange={setCity}
          onPick={(it) => it.sub && setProvince(it.sub)}
          items={cityItems}
          placeholder="City"
          icon={<MapPin className="h-4 w-4 text-muted-foreground" />}
          inputClassName="w-40 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
          containerClassName="px-3 sm:border-l sm:border-border"
        />
        <select
          value={province}
          onChange={(e) => setProvince(e.target.value)}
          className="rounded-md border border-border bg-background px-2 py-2 text-sm"
          aria-label="Province"
        >
          <option value="">All provinces</option>
          {PROVINCES.map((p) => (
            <option key={p.code} value={p.code}>
              {p.code}
            </option>
          ))}
        </select>
        <Link
          to="/marketplace/new"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> Post a listing
        </Link>
      </div>

      {didYouMean && (
        <div className="mt-3 rounded-lg border border-border bg-card/60 px-4 py-2 text-sm">
          Did you mean{" "}
          <button onClick={() => setQ(didYouMean)} className="font-medium text-primary underline-offset-2 hover:underline">
            {didYouMean}
          </button>
          ?
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[240px_1fr_280px]">
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

          {/* Distance */}
          <div className="rounded-2xl border border-border bg-card/60 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Distance</h3>
            {!userLoc ? (
              <button
                onClick={() => {
                  if (!navigator.geolocation) {
                    toast.error("Location not supported");
                    return;
                  }
                  navigator.geolocation.getCurrentPosition(
                    (pos) => setUserLoc({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                    () => toast.error("Couldn't get your location"),
                  );
                }}
                className="mt-3 w-full rounded-md border border-border px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent/10"
              >
                Use my location
              </button>
            ) : (
              <div className="mt-3 space-y-2">
                <input
                  type="range"
                  min={0}
                  max={200}
                  step={5}
                  value={maxDistanceKm}
                  onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{maxDistanceKm === 0 ? "Any" : `Within ${maxDistanceKm} km`}</span>
                  <button onClick={() => setUserLoc(null)} className="hover:text-foreground">Clear</button>
                </div>
              </div>
            )}
          </div>

          {/* Delivery / Pickup */}
          <div className="rounded-2xl border border-border bg-card/60 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Delivery</h3>
            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              {[
                { v: "", l: "Any" },
                { v: "delivery", l: "Delivery" },
                { v: "pickup", l: "Pickup" },
              ].map((t) => (
                <button
                  key={t.v || "any"}
                  onClick={() => setDelivery(t.v)}
                  className={`rounded-md border px-2 py-1.5 ${
                    delivery === t.v
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:bg-accent/10"
                  }`}
                >
                  {t.l}
                </button>
              ))}
            </div>
          </div>

          {/* Ratings */}
          <div className="rounded-2xl border border-border bg-card/60 p-4">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Seller rating</h3>
            <div className="mt-3 flex gap-1">
              {[0, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setMinRating(n)}
                  className={`flex-1 rounded-md border px-2 py-1.5 text-xs ${
                    minRating === n
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border text-muted-foreground hover:bg-accent/10"
                  }`}
                >
                  {n === 0 ? "Any" : `${n}★+`}
                </button>
              ))}
            </div>
          </div>

          {/* Toggles */}
          <div className="rounded-2xl border border-border bg-card/60 p-4 space-y-2.5">
            <label className="flex cursor-pointer items-center justify-between gap-2 text-sm">
              <span className="text-foreground">Verified businesses</span>
              <input type="checkbox" checked={verifiedOnly} onChange={(e) => setVerifiedOnly(e.target.checked)} className="h-4 w-4 accent-primary" />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-2 text-sm">
              <span className="text-foreground">Deals only</span>
              <input type="checkbox" checked={dealsOnly} onChange={(e) => setDealsOnly(e.target.checked)} className="h-4 w-4 accent-primary" />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-2 text-sm">
              <span className="text-foreground">Trending</span>
              <input type="checkbox" checked={trending} onChange={(e) => setTrending(e.target.checked)} className="h-4 w-4 accent-primary" />
            </label>
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
            <div>
              <div className="mb-4 flex items-center justify-between rounded-xl border border-dashed border-border bg-card/40 px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  No listings match your filters yet — here are some featured picks.
                </p>
                <Link
                  to="/marketplace/new"
                  className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="h-3.5 w-3.5" /> Post a listing
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
                {FEATURED_PLACEHOLDERS.map((l) => (
                  <MarketplaceCard
                    key={l.id}
                    listing={l}
                    photo={undefined}
                    isFav={false}
                    onToggleFav={() => toast("Sign in to save listings")}
                  />
                ))}
              </div>
            </div>

          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
                {listings.map((l) => (
                  <MarketplaceCard
                    key={l.id}
                    listing={l}
                    photo={photos[l.id]}
                    isFav={favs.has(l.id)}
                    onToggleFav={toggleFav}
                  />
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="mt-8 flex items-center justify-between gap-3">
                  <button
                    onClick={() => goPage(page - 1)}
                    disabled={!canPrev}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft className="h-4 w-4" /> Prev
                  </button>
                  <span className="text-sm text-muted-foreground">
                    Page <span className="font-medium text-foreground">{page}</span> of {totalPages}
                  </span>
                  <button
                    onClick={() => goPage(page + 1)}
                    disabled={!canNext}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-2 text-sm font-medium text-foreground hover:bg-accent/10 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* Right sidebar: sponsored, trending, deals, suggested */}
        <div className="hidden lg:block">
          <MarketplaceRightSidebar city={city.trim() || undefined} categoryId={category || undefined} />
        </div>
      </div>
    </div>
  );
}
