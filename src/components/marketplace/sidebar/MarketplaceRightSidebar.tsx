import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { photoUrl, formatPrice } from "@/lib/marketplace";
import { listingPlaceholder, businessPlaceholder } from "@/lib/placeholder-images";
import { Sparkles, TrendingUp, Flame, Building2 } from "lucide-react";


type Biz = { id: string; slug: string; name: string; city: string | null; hero_image_url: string | null };
type MiniListing = {
  id: string;
  title: string;
  price_cents: number;
  currency: string;
  listing_type: string;
  city: string | null;
};

function Panel({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4">
      <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

export function MarketplaceRightSidebar({ city, categoryId }: { city?: string; categoryId?: string }) {
  const [sponsored, setSponsored] = useState<Biz[]>([]);
  const [trending, setTrending] = useState<MiniListing[]>([]);
  const [trendingPhotos, setTrendingPhotos] = useState<Record<string, string>>({});
  const [deals, setDeals] = useState<MiniListing[]>([]);
  const [dealPhotos, setDealPhotos] = useState<Record<string, string>>({});
  const [suggested, setSuggested] = useState<Biz[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("businesses")
        .select("id,slug,name,city,hero_image_url")
        .eq("status", "approved")
        .gt("featured_until", new Date().toISOString())
        .limit(3);
      setSponsored((data ?? []) as Biz[]);
    })();
  }, []);

  useEffect(() => {
    (async () => {
      const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("marketplace_listings")
        .select("id,title,price_cents,currency,listing_type,city")
        .eq("status", "active")
        .gte("created_at", since)
        .order("view_count", { ascending: false })
        .limit(5);
      const rows = (data ?? []) as MiniListing[];
      setTrending(rows);
      if (rows.length) {
        const { data: ph } = await supabase
          .from("marketplace_listing_photos")
          .select("listing_id,storage_path,sort_order")
          .in("listing_id", rows.map((r) => r.id))
          .order("sort_order");
        const map: Record<string, string> = {};
        (ph ?? []).forEach((p: any) => {
          if (!map[p.listing_id]) map[p.listing_id] = p.storage_path;
        });
        setTrendingPhotos(map);
      }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      let q = supabase
        .from("marketplace_listings")
        .select("id,title,price_cents,currency,listing_type,city,tags")
        .eq("status", "active")
        .contains("tags", ["deal"])
        .order("created_at", { ascending: false })
        .limit(5);
      if (city) q = q.ilike("city", `%${city}%`);
      const { data } = await q;
      const rows = (data ?? []) as MiniListing[];
      setDeals(rows);
      if (rows.length) {
        const { data: ph } = await supabase
          .from("marketplace_listing_photos")
          .select("listing_id,storage_path,sort_order")
          .in("listing_id", rows.map((r) => r.id))
          .order("sort_order");
        const map: Record<string, string> = {};
        (ph ?? []).forEach((p: any) => {
          if (!map[p.listing_id]) map[p.listing_id] = p.storage_path;
        });
        setDealPhotos(map);
      }
    })();
  }, [city]);

  useEffect(() => {
    (async () => {
      let q = supabase
        .from("businesses")
        .select("id,slug,name,city,hero_image_url,category_id")
        .eq("status", "approved")
        .limit(5);
      if (categoryId) q = q.eq("category_id", categoryId);
      const { data } = await q;
      setSuggested((data ?? []) as Biz[]);
    })();
  }, [categoryId]);

  return (
    <aside className="space-y-4">
      {sponsored.length > 0 && (
        <Panel icon={<Sparkles className="h-3.5 w-3.5 text-amber-500" />} title="Sponsored">
          <ul className="space-y-2">
            {sponsored.map((b) => (
              <li key={b.id}>
                <Link
                  to="/business/$slug"
                  params={{ slug: b.slug }}
                  className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent/10"
                >
                  <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                    <img
                      src={b.hero_image_url || businessPlaceholder(b.id)}
                      alt={b.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="line-clamp-1 text-sm font-medium">{b.name}</div>
                    <div className="line-clamp-1 text-xs text-muted-foreground">{b.city ?? ""}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {trending.length > 0 && (
        <Panel icon={<TrendingUp className="h-3.5 w-3.5 text-primary" />} title="Trending">
          <ul className="space-y-2">
            {trending.map((l) => (
              <li key={l.id}>
                <Link
                  to="/marketplace/$id"
                  params={{ id: l.id }}
                  className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent/10"
                >
                  <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                    {trendingPhotos[l.id] && (
                      <img src={photoUrl(trendingPhotos[l.id])} alt={l.title} className="h-full w-full object-cover" loading="lazy" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="line-clamp-1 text-sm">{l.title}</div>
                    <div className="text-xs font-semibold text-foreground">{formatPrice(l.price_cents, l.currency, l.listing_type)}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {deals.length > 0 && (
        <Panel icon={<Flame className="h-3.5 w-3.5 text-red-500" />} title={city ? `Deals in ${city}` : "Nearby deals"}>
          <ul className="space-y-2">
            {deals.map((l) => (
              <li key={l.id}>
                <Link
                  to="/marketplace/$id"
                  params={{ id: l.id }}
                  className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent/10"
                >
                  <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-md bg-muted">
                    {dealPhotos[l.id] && (
                      <img src={photoUrl(dealPhotos[l.id])} alt={l.title} className="h-full w-full object-cover" loading="lazy" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="line-clamp-1 text-sm">{l.title}</div>
                    <div className="text-xs text-muted-foreground">{l.city ?? ""}</div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      {suggested.length > 0 && (
        <Panel icon={<Building2 className="h-3.5 w-3.5 text-primary" />} title="Suggested businesses">
          <ul className="space-y-2">
            {suggested.map((b) => (
              <li key={b.id}>
                <Link
                  to="/business/$slug"
                  params={{ slug: b.slug }}
                  className="block rounded-lg p-2 text-sm hover:bg-accent/10"
                >
                  <div className="line-clamp-1 font-medium">{b.name}</div>
                  <div className="line-clamp-1 text-xs text-muted-foreground">{b.city ?? ""}</div>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      )}
    </aside>
  );
}
