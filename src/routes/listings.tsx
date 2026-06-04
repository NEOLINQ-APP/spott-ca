import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ListingCard } from "@/components/ListingCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Loader2, MapPin, SlidersHorizontal } from "lucide-react";
import {
  FEED_SECTIONS,
  SORT_OPTIONS,
  type FeedSection,
  type SortOption,
  listUnifiedListings,
} from "@/lib/listings-unified.functions";

// Unified Spott listings feed. Single feed, single card, all sections share
// the BaseListing schema — adding a new section means adding a tab + a row
// adapter, not a redesign.
export const Route = createFileRoute("/listings")({
  head: () => ({
    meta: [
      { title: "Browse listings — Spott" },
      {
        name: "description",
        content:
          "Browse everything on Spott — marketplace items, services, business directory, and vehicles — in one unified feed.",
      },
      { tagName: "link", rel: "canonical", href: "https://spott.ca/listings" },
    ],
  }),
  component: ListingsPage,
});

const SECTION_LABELS: Record<FeedSection, string> = {
  all: "All",
  marketplace: "Marketplace",
  services: "Services",
  "business-directory": "Business Directory",
  vehicles: "Vehicles",
};

const SORT_LABELS: Record<SortOption, string> = {
  newest: "Newest",
  oldest: "Oldest",
  price_asc: "Price: Low to High",
  price_desc: "Price: High to Low",
  distance: "Distance",
  most_viewed: "Most Viewed",
  featured_first: "Featured First",
};

function ListingsPage() {
  const list = useServerFn(listUnifiedListings);

  // All filter state is local — query re-runs reactively, no page reload.
  const [q, setQ] = useState("");
  const [section, setSection] = useState<FeedSection>("all");
  const [city, setCity] = useState("");
  const [radius, setRadius] = useState<string>(""); // km, empty = no radius
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");
  const [sort, setSort] = useState<SortOption>("newest");
  const [geoBusy, setGeoBusy] = useState(false);

  const filters = useMemo(
    () => ({
      q: q || undefined,
      section,
      city: city || undefined,
      lat: coords?.lat,
      lng: coords?.lng,
      radius_km: radius ? Number(radius) : undefined,
      price_min_cents: priceMin ? Math.round(Number(priceMin) * 100) : undefined,
      price_max_cents: priceMax ? Math.round(Number(priceMax) * 100) : undefined,
      sort,
      limit: 48,
    }),
    [q, section, city, coords, radius, priceMin, priceMax, sort],
  );

  const { data, isFetching } = useQuery({
    queryKey: ["unified-listings", filters],
    queryFn: () => list({ data: filters }),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });

  const listings = data?.listings ?? [];

  function useNearMe() {
    if (!navigator.geolocation) return;
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        if (!radius) setRadius("25");
        if (sort === "newest") setSort("distance");
        setGeoBusy(false);
      },
      () => setGeoBusy(false),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60_000 },
    );
  }

  function clearLocation() {
    setCoords(null);
    setRadius("");
    setCity("");
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <header className="mb-4">
        <h1 className="text-3xl font-bold">Browse listings</h1>
        <p className="text-muted-foreground">
          Everything on Spott in one feed — items, services, businesses, and vehicles.
        </p>
      </header>

      {/* Top-level filter bar */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Input
          placeholder="Search listings…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full sm:max-w-xs"
        />

        <Select value={section} onValueChange={(v) => setSection(v as FeedSection)}>
          <SelectTrigger className="w-[170px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            {FEED_SECTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {SECTION_LABELS[s]}
                {s === "vehicles" ? " (Private)" : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          placeholder="City"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          className="w-[140px]"
        />

        <Button
          type="button"
          variant={coords ? "default" : "outline"}
          size="sm"
          onClick={useNearMe}
          disabled={geoBusy}
        >
          {geoBusy ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <MapPin className="w-4 h-4 mr-1" />
          )}
          Near Me
        </Button>

        <Select value={sort} onValueChange={(v) => setSort(v as SortOption)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((s) => (
              <SelectItem
                key={s}
                value={s}
                disabled={s === "distance" && !coords}
              >
                {SORT_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* More Filters */}
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm">
              <SlidersHorizontal className="w-4 h-4 mr-1" />
              More Filters
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>More filters</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium">Price range (CAD)</label>
                <div className="flex gap-2 mt-1">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={priceMin}
                    onChange={(e) => setPriceMin(e.target.value)}
                  />
                  <Input
                    type="number"
                    placeholder="Max"
                    value={priceMax}
                    onChange={(e) => setPriceMax(e.target.value)}
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Radius (km)</label>
                <Input
                  type="number"
                  placeholder="e.g. 25"
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use with "Near Me" to limit results by distance.
                </p>
              </div>
              <Button variant="outline" onClick={clearLocation} className="w-full">
                Clear location filters
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Results */}
      <div className="flex items-center justify-between mb-3 text-sm text-muted-foreground">
        <span>
          {data ? `${data.total} result${data.total === 1 ? "" : "s"}` : "Loading…"}
        </span>
        {isFetching && <Loader2 className="w-4 h-4 animate-spin" />}
      </div>

      {listings.length === 0 && !isFetching ? (
        <div className="text-muted-foreground py-12 text-center">
          No listings match these filters.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {listings.map((l) => (
            <ListingCard key={`${l.kind}:${l.id}`} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}
