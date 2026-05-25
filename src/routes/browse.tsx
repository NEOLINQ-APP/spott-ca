import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Search, MapPin, Star, Bookmark, Map as MapIcon, List as ListIcon, Phone, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { getOpenStatus, type BusinessHours } from "@/lib/hours";
import { PriceBadge } from "@/components/PriceTierEditor";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { trackSearch } from "@/lib/search.functions";
import { CityAutocomplete } from "@/components/CityAutocomplete";
import { tokenize, expandTokens, normalize, lev } from "@/lib/search-helpers";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { lazy, Suspense } from "react";

const BrowseMap = lazy(() => import("@/components/BrowseMap").then((m) => ({ default: m.BrowseMap })));


const searchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  city: z.string().optional(),
  page: z.number().int().min(1).optional(),
});

export const Route = createFileRoute("/browse")({
  validateSearch: searchSchema,
  component: BrowsePage,
  head: () => ({
    meta: [
      { title: "Browse Canadian businesses by city & category — Spott.ca" },
      { name: "description", content: "Search and filter verified local businesses across Canada by category, city, and keyword. Reviews, ratings, hours, and contact info." },
      { property: "og:title", content: "Browse Canadian businesses — Spott.ca" },
      { property: "og:description", content: "Find verified restaurants, salons, mechanics, and more across Canada." },
      { property: "og:url", content: "https://www.spott.ca/browse" },
    ],
    links: [{ rel: "canonical", href: "https://www.spott.ca/browse" }],
  }),
});

type Category = { id: string; slug: string; name: string };
type FeaturePill = { slug: string; label: string; icon: string | null; highlighted: boolean };
type Business = {
  id: string; slug: string; name: string; description: string | null;
  city: string | null; province: string | null; hero_image_url: string | null; category_id: string | null;
  keywords: string[] | null;
  latitude: number | null; longitude: number | null;
  phone: string | null;
  hours: BusinessHours | null;
  price_tier: number | null;
  featured_highlights_until: string | null;
  features?: FeaturePill[];
};

const PAGE_SIZE = 15;


const BROAD_EXPANDED_TOKENS = new Set([
  "restaurant", "restaurants", "food", "dining", "takeout", "delivery", "eat", "meal", "cuisine",
  "burger", "burgers", "fries", "frie", "fry", "fast food", "fastfood", "breakfast", "shop", "store", "service", "services",
]);

const escapeOrValue = (value: string) => value.replace(/[%,(){}]/g, " ").trim();

/** Score a business by how many query tokens hit name/desc/city/keywords.
 *  Tag (keyword) matches are tracked separately so we can boost & rank them. */
function tokenMatchScore(business: Business, tokens: string[]): { hits: number; tagHits: number } {
  const name = normalize(business.name ?? "");
  const desc = normalize(business.description ?? "");
  const city = normalize(business.city ?? "");
  const tags = (business.keywords ?? []).map((k) => normalize(k));
  const text = [name, desc, city, tags.join(" ")].join(" ");
  const textTokens = text.split(/\s+/).filter(Boolean);

  let hits = 0;
  let tagHits = 0;
  for (const tok of tokens) {
    const t = normalize(tok);
    if (!t) continue;
    let matched = false;
    let tagMatched = false;
    // Tag match (case-insensitive, partial allowed for ≥4 chars) — strongest signal
    if (tags.some((tag) => tag === t || (t.length >= 4 && tag.includes(t)) || (tag.length >= 4 && t.includes(tag)))) {
      tagMatched = true;
      matched = true;
    } else if (textTokens.some((w) => w === t)) {
      matched = true;
    } else if (t.length >= 4 && text.includes(t)) {
      matched = true;
    } else if (t.length >= 5 && textTokens.some((w) => w.length >= 5 && lev(w, t, 2) <= 2)) {
      matched = true;
    }
    if (matched) hits++;
    if (tagMatched) tagHits++;
  }
  return { hits, tagHits };
}

function getPageList(current: number, total: number): (number | "…")[] {
  const out: (number | "…")[] = [];
  const set = new Set<number>([1, total, current, current - 1, current + 1]);
  const pages = [...set].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  let prev = 0;
  for (const p of pages) {
    if (p - prev > 1) out.push("…");
    out.push(p);
    prev = p;
  }
  return out;
}

function BrowsePage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const track = useServerFn(trackSearch);
  const [categories, setCategories] = useState<Category[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(search.q ?? "");
  const [city, setCity] = useState(search.city ?? "");
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<"list" | "map">("list");
  const page = search.page && search.page > 0 ? search.page : 1;
  const totalPages = Math.max(1, Math.ceil(businesses.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedBusinesses = businesses.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const goToPage = (p: number) => navigate({ to: "/browse", search: { ...search, page: p === 1 ? undefined : p } as any });


  const activeCategory = useMemo(
    () => categories.find((c) => c.slug === search.category),
    [categories, search.category],
  );

  useEffect(() => {
    supabase.from("categories").select("id,slug,name").order("sort_order").then(({ data }) => {
      if (data) setCategories(data);
    });
  }, []);

  useEffect(() => { setQ(search.q ?? ""); setCity(search.city ?? ""); }, [search.q, search.city]);

  useEffect(() => {
    setLoading(true);
    (async () => {
      // Expand the query with synonyms.
      const baseTokens = search.q ? tokenize(search.q) : [];
      const baseTokenSet = new Set<string>();
      baseTokens.forEach((tok) => {
        const normalized = normalize(tok);
        const compact = normalized.replace(/\s+/g, "");
        if (normalized) baseTokenSet.add(normalized);
        if (compact.length >= 4) baseTokenSet.add(compact);
        if (compact.endsWith("s") && compact.length >= 5) baseTokenSet.add(compact.slice(0, -1));
      });
      const tokens = expandTokens(baseTokens);
      const serverTokens = tokens.filter((tok) => baseTokenSet.has(tok) || !BROAD_EXPANDED_TOKENS.has(tok));
      // Lowercase the raw query so every downstream comparison is case-insensitive,
      // regardless of how the user typed it (e.g. "McDonalds", "MCDONALDS", "mcDoNaLdS").
      const rawQuery = (search.q ?? "").trim().toLowerCase();
      let categoryIds: string[] = [];
      if (serverTokens.length) {
        const ors = serverTokens.map((t) => {
          const safe = escapeOrValue(t);
          return safe ? `name.ilike.%${safe}%,slug.ilike.%${safe}%` : "";
        }).filter(Boolean).join(",");
        const { data: catMatches } = await supabase.from("categories").select("id,name,slug").or(ors);
        categoryIds = (catMatches ?? []).map((c: any) => c.id);
      }

      let query = supabase
        .from("businesses")
        .select("id,slug,name,description,city,province,hero_image_url,category_id,keywords,latitude,longitude,phone,hours,price_tier,featured_highlights_until")
        .eq("status", "approved")
        .order("created_at", { ascending: false });



      if (activeCategory) query = query.eq("category_id", activeCategory.id);
      if (serverTokens.length) {
        const ors: string[] = [];
        const rawSafe = escapeOrValue(rawQuery);
        if (rawSafe) {
          ors.push(`name.ilike.%${rawSafe}%`, `description.ilike.%${rawSafe}%`);
        }
        for (const tok of serverTokens) {
          const safe = escapeOrValue(tok);
          if (!safe) continue;
          ors.push(`name.ilike.%${safe}%`, `description.ilike.%${safe}%`, `keywords.cs.{${safe}}`);
        }
        for (const id of categoryIds) ors.push(`category_id.eq.${id}`);
        query = query.or(ors.join(","));
      }
      if (search.city) {
        const c = search.city.replace(/[%,]/g, " ");
        query = query.or(`city.ilike.%${c}%,province.ilike.%${c}%`);
      }
      // Paginate through results in 1000-row chunks (Supabase caps single queries at 1000).
      const PAGE = 1000;
      const MAX_ROWS = 5000;
      const seen = new Set<string>();
      let rows: Business[] = [];
      for (let from = 0; from < MAX_ROWS; from += PAGE) {
        const { data } = await query.range(from, from + PAGE - 1);
        const chunk = (data as Business[]) ?? [];
        for (const r of chunk) {
          if (!seen.has(r.id)) {
            seen.add(r.id);
            rows.push(r);
          }
        }
        if (chunk.length < PAGE) break;
      }


      // Exact-name match: if any business name equals the raw query (case-insensitive),
      // only show those businesses so users searching a specific name aren't drowned in fuzzy hits.
      if (rawQuery) {
        const exact = rows.filter((b) => (b.name ?? "").trim().toLowerCase() === rawQuery);
        if (exact.length > 0) {
          setBusinesses(exact);
          setLoading(false);
          return;
        }
      }

      // Client-side scoring: rank by tag matches, then total hits.
      // Require at least one match — for multi-word queries, require ≥ majority of base tokens.
      if (serverTokens.length) {
        const baseList = Array.from(baseTokenSet);
        const need = baseList.length >= 2 ? Math.ceil(baseList.length / 2) : 1;
        const scored = rows
          .map((b) => ({ b, ...tokenMatchScore(b, baseList.length ? baseList : serverTokens) }))
          .filter(({ hits, tagHits }) => tagHits >= 1 || hits >= need);
        scored.sort((a, z) => (z.tagHits - a.tagHits) || (z.hits - a.hits));
        rows = scored.map((s) => s.b);
      }
      setBusinesses(rows);
      setLoading(false);
    })();
  }, [activeCategory, search.q, search.city]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next = q.trim();
    const c = city.trim();
    navigate({ to: "/browse", search: { ...search, q: next || undefined, city: c || undefined } as any });
    if (next) {
      track({ data: { query: next, category_slug: search.category ?? null, city: c || null } }).catch(() => {});
    }
  };

  const saveSearch = async () => {
    if (!user) { toast.info("Sign in to save searches."); navigate({ to: "/auth" }); return; }
    if (!q && !city && !search.category) { toast.info("Enter a search first."); return; }
    setSaving(true);
    const label = [q || "All listings", city, search.category].filter(Boolean).join(" · ");
    const { error } = await supabase.from("saved_searches").insert({
      user_id: user.id,
      label,
      query: q || null,
      city: city || null,
      category_slug: search.category ?? null,
    });
    setSaving(false);
    if (error) toast.error(error.message); else toast.success("Search saved to your dashboard.");
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {activeCategory ? activeCategory.name : t("browse.title")}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t(businesses.length === 1 ? "browse.listingsOne" : "browse.listingsOther", { count: businesses.length })}
        </p>

        <form
          onSubmit={submit}
          className="mt-6 flex flex-col gap-2 rounded-xl border border-border bg-card p-2 sm:flex-row sm:items-center"
        >
          <div className="flex flex-1 items-center gap-2 px-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Try 'Wendy’s', 'McDonald’s', or 'closest mechanic'"
              className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="px-2 sm:border-l sm:border-border">
            <CityAutocomplete value={city} onChange={setCity} />
          </div>
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition">
            {t("hero.search")}
          </button>
          <button
            type="button"
            onClick={saveSearch}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground hover:bg-accent/10 hover:text-foreground disabled:opacity-50"
          >
            <Bookmark className="h-3.5 w-3.5" /> Save
          </button>
        </form>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link to="/browse" search={{} as any} className={`rounded-full border px-3 py-1.5 text-xs transition ${!activeCategory ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}>
            {t("browse.all")}
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              to="/browse"
              search={{ category: c.slug } as any}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${activeCategory?.id === c.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              {c.name}
            </Link>
          ))}
        </div>

        <div className="mt-6 inline-flex rounded-lg border border-border p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setView("list")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition ${view === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <ListIcon className="h-3.5 w-3.5" /> List
          </button>
          <button
            type="button"
            onClick={() => setView("map")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 transition ${view === "map" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
          >
            <MapIcon className="h-3.5 w-3.5" /> Map
          </button>
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-2xl bg-card/60" />
              ))}
            </div>
          ) : businesses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card/40 p-12 text-center">
              <h3 className="font-display text-lg">{t("browse.emptyTitle")}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{t("browse.emptyBody")}</p>
              <Link to="/auth" search={{ tab: "business" } as any} className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                {t("browse.addListing")}
              </Link>
            </div>
          ) : view === "map" ? (
            <Suspense fallback={<div className="h-[70vh] w-full animate-pulse rounded-2xl bg-card/60" />}>
              <BrowseMap
                pins={pagedBusinesses
                  .filter((b) => b.latitude != null && b.longitude != null)
                  .map((b) => ({
                    id: b.id,
                    slug: b.slug,
                    name: b.name,
                    city: b.city,
                    latitude: Number(b.latitude),
                    longitude: Number(b.longitude),
                  }))}
              />
            </Suspense>
          ) : (
            <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {pagedBusinesses.map((b) => {
                const status = getOpenStatus(b.hours, b.province);
                return (
                <div key={b.id} className="group relative overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary/40">
                  <Link to="/business/$slug" params={{ slug: b.slug }} className="block">
                    <div className="aspect-[16/10] overflow-hidden bg-secondary">
                      {b.hero_image_url ? (
                        <img src={b.hero_image_url} alt={b.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">{t("browse.noPhoto")}</div>
                      )}
                    </div>
                    <div className="p-5 pb-3">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-display text-lg font-semibold">{b.name}</h3>
                        <PriceBadge tier={b.price_tier} />
                      </div>
                      {(b.city || b.province) && (
                        <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" /> {[b.city, b.province].filter(Boolean).join(", ")}
                        </div>
                      )}
                      {status && (
                        <div className="mt-2 inline-flex items-center gap-1 text-[11px]">
                          <Clock className="h-3 w-3" />
                          <span className={status.open ? "font-semibold text-emerald-600 dark:text-emerald-400" : "font-semibold text-rose-600 dark:text-rose-400"}>{status.label}</span>
                          <span className="text-muted-foreground">· {status.detail}</span>
                        </div>
                      )}
                      {b.description && (
                        <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{b.description}</p>
                      )}
                    </div>
                  </Link>
                  <div className="flex items-center gap-2 px-5 pb-4">
                    {b.phone ? (
                      <a
                        href={`tel:${b.phone.replace(/[^+0-9]/g, "")}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                      >
                        <Phone className="h-3.5 w-3.5" /> Call
                      </a>
                    ) : (
                      <Link
                        to="/business/$slug" params={{ slug: b.slug }}
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs font-semibold hover:bg-accent/10"
                      >
                        Contact
                      </Link>
                    )}
                    <Link
                      to="/business/$slug" params={{ slug: b.slug }}
                      className="inline-flex items-center justify-center gap-1 rounded-md border border-border px-3 py-2 text-xs hover:bg-accent/10"
                    >
                      View
                    </Link>
                  </div>
                </div>
              );})}
            </div>
            {totalPages > 1 && (
              <nav className="mt-8 flex items-center justify-center gap-1" aria-label="Pagination">
                <button
                  type="button"
                  onClick={() => goToPage(Math.max(1, safePage - 1))}
                  disabled={safePage <= 1}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent/10 disabled:opacity-40"
                >
                  <ChevronLeft className="h-3.5 w-3.5" /> Prev
                </button>
                {getPageList(safePage, totalPages).map((p, i) =>
                  p === "…" ? (
                    <span key={`e${i}`} className="px-2 text-xs text-muted-foreground">…</span>
                  ) : (
                    <button
                      key={p}
                      type="button"
                      onClick={() => goToPage(p as number)}
                      className={`min-w-[2rem] rounded-md border px-2.5 py-1.5 text-xs ${p === safePage ? "border-primary bg-primary text-primary-foreground" : "border-border hover:bg-accent/10"}`}
                    >
                      {p}
                    </button>
                  ),
                )}
                <button
                  type="button"
                  onClick={() => goToPage(Math.min(totalPages, safePage + 1))}
                  disabled={safePage >= totalPages}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent/10 disabled:opacity-40"
                >
                  Next <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </nav>
            )}
            </>
          )}
        </div>

      </div>
    </div>
  );
}
