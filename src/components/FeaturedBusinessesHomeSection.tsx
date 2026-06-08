import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Sparkles, MapPin, ArrowRight, Building2, Utensils, Home, Car, Wrench } from "lucide-react";
import { listFeaturedBusinesses } from "@/lib/featured.functions";
import { trackPlacementEvent, trackPlacementImpressions } from "@/lib/featured-analytics.functions";
import { VerificationBadge } from "@/components/VerificationBadge";

type Section = "businesses" | "services" | "restaurants" | "realtors" | "dealerships";

type Row = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  city: string | null;
  province: string | null;
  hero_image_url: string | null;
  business_type: string | null;
  featured_until: string | null;
  featured_tier: string | null;
};

const TABS: { value: Section; label: string; Icon: typeof Building2 }[] = [
  { value: "businesses", label: "Businesses", Icon: Building2 },
  { value: "services", label: "Services", Icon: Wrench },
  { value: "restaurants", label: "Restaurants", Icon: Utensils },
  { value: "realtors", label: "Realtors", Icon: Home },
  { value: "dealerships", label: "Dealerships", Icon: Car },
];

export function FeaturedBusinessesHomeSection() {
  const fetchFeatured = useServerFn(listFeaturedBusinesses);
  const trackImpressions = useServerFn(trackPlacementImpressions);
  const trackEvent = useServerFn(trackPlacementEvent);
  const [active, setActive] = useState<Section>("businesses");
  const [data, setData] = useState<Record<Section, Row[]>>({
    businesses: [], services: [], restaurants: [], realtors: [], dealerships: [],
  });
  const [loaded, setLoaded] = useState<Record<Section, boolean>>({
    businesses: false, services: false, restaurants: false, realtors: false, dealerships: false,
  });

  useEffect(() => {
    if (loaded[active]) return;
    fetchFeatured({ data: { section: active, limit: 8 } })
      .then((res) => {
        const rows = (res.rows as Row[]) ?? [];
        setData((d) => ({ ...d, [active]: rows }));
        setLoaded((l) => ({ ...l, [active]: true }));
        if (rows.length) {
          trackImpressions({
            data: { business_ids: rows.map((r) => r.id), source: "homepage", section: active },
          }).catch(() => {});
        }
      })
      .catch(() => setLoaded((l) => ({ ...l, [active]: true })));
  }, [active, loaded, fetchFeatured, trackImpressions]);

  const rows = data[active];

  const handleClick = (id: string) => {
    trackEvent({ data: { business_id: id, event_type: "click", source: "homepage", section: active } })
      .catch(() => {});
  };

  return (
    <section className="mx-auto max-w-7xl px-6 py-12">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
            <Sparkles className="h-3.5 w-3.5" /> Featured on Spott.ca
          </div>
          <h2 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
            Discover featured Canadian {TABS.find((t) => t.value === active)?.label.toLowerCase()}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Hand-picked businesses, growing across cities in Canada.
          </p>
        </div>
        <Link
          to="/verify"
          className="text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1"
        >
          Get featured <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex flex-wrap gap-2">
        {TABS.map(({ value, label, Icon }) => {
          const isActive = value === active;
          return (
            <button
              key={value}
              type="button"
              onClick={() => setActive(value)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          );
        })}
      </div>

      {/* Grid */}
      {!loaded[active] ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-2xl border border-border bg-card/40" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <EmptyFeatured section={active} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {rows.map((b) => (
            <FeaturedCard key={b.id} biz={b} />
          ))}
        </div>
      )}
    </section>
  );
}

function FeaturedCard({ biz }: { biz: Row }) {
  return (
    <Link
      to="/business/$slug"
      params={{ slug: biz.slug }}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-card transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        {biz.hero_image_url ? (
          <img
            src={biz.hero_image_url}
            alt={biz.name}
            loading="lazy"
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full w-full place-items-center text-muted-foreground">
            <Building2 className="h-10 w-10" />
          </div>
        )}
        <div className="absolute left-2 top-2">
          <VerificationBadge type="featured-business" size="sm" />
        </div>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="text-base font-semibold leading-tight line-clamp-1">{biz.name}</div>
        {biz.business_type && (
          <div className="mt-0.5 text-xs text-muted-foreground capitalize">{biz.business_type}</div>
        )}
        {biz.description && (
          <p className="mt-2 line-clamp-2 text-xs text-foreground/80">{biz.description}</p>
        )}
        <div className="mt-auto pt-3 flex items-center justify-between text-xs">
          <span className="inline-flex items-center gap-1 text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {[biz.city, biz.province].filter(Boolean).join(", ") || "—"}
          </span>
          <span className="font-semibold text-primary group-hover:underline">View →</span>
        </div>
      </div>
    </Link>
  );
}

function EmptyFeatured({ section }: { section: Section }) {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
      <Sparkles className="mx-auto mb-2 h-6 w-6 text-amber-500" />
      <h3 className="text-base font-semibold">Featured spots open in {section}</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Be one of the first featured Canadian {section} on Spott.ca.
      </p>
      <Link
        to="/verify"
        className="mt-4 inline-flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        Apply for featured placement <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  );
}
