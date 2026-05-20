import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Search, MapPin, Star, Bookmark } from "lucide-react";
import { useTranslation } from "react-i18next";
import { z } from "zod";
import { trackSearch } from "@/lib/search.functions";
import { CityAutocomplete } from "@/components/CityAutocomplete";
import { tokenize, expandTokens, fuzzyMatch, normalize, lev } from "@/lib/search-helpers";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

const searchSchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  city: z.string().optional(),
});

export const Route = createFileRoute("/browse")({
  validateSearch: searchSchema,
  component: BrowsePage,
});

type Category = { id: string; slug: string; name: string };
type Business = {
  id: string; slug: string; name: string; description: string | null;
  city: string | null; province: string | null; hero_image_url: string | null; category_id: string | null;
  keywords: string[] | null;
};

const BROAD_EXPANDED_TOKENS = new Set([
  "restaurant", "restaurants", "food", "dining", "takeout", "delivery", "eat", "meal", "cuisine",
  "burger", "burgers", "fries", "frie", "fry", "fast food", "fastfood", "breakfast", "shop", "store", "service", "services",
]);

const escapeOrValue = (value: string) => value.replace(/[%,(){}]/g, " ").trim();

function matchesExpandedSearch(business: Business, tokens: string[]) {
  const haystack = [business.name, business.description ?? "", business.city ?? "", (business.keywords ?? []).join(" ")].join(" ");
  if (fuzzyMatch(haystack, tokens, 1)) return true;

  const hayTokens = normalize(haystack).split(/\s+/).filter(Boolean);
  return tokens.some((token) => {
    const compactToken = normalize(token).replace(/\s+/g, "");
    if (compactToken.length < 5) return false;
    return hayTokens.some((word) => {
      const compactWord = normalize(word).replace(/\s+/g, "");
      return compactWord.length >= 5 && lev(compactWord, compactToken, 2) <= 2;
    });
  });
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
        .select("id,slug,name,description,city,province,hero_image_url,category_id,keywords")
        .eq("status", "approved")
        .not("hero_image_url", "is", null)
        .neq("hero_image_url", "")
        .order("created_at", { ascending: false })
        .limit(200);
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
      const { data } = await query;
      let rows = (data as Business[]) ?? [];

      // Client-side fuzzy refinement so typos still match (but stricter to avoid spurious hits).
      if (serverTokens.length) {
        rows = rows.filter((b) => matchesExpandedSearch(b, serverTokens));
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

        <div className="mt-10">
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
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {businesses.map((b) => (
                <Link
                  key={b.id} to="/business/$slug" params={{ slug: b.slug }}
                  className="group block overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary/40"
                >
                  <div className="aspect-[16/10] overflow-hidden bg-secondary">
                    {b.hero_image_url ? (
                      <img src={b.hero_image_url} alt={b.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">{t("browse.noPhoto")}</div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-display text-lg font-semibold">{b.name}</h3>
                    {(b.city || b.province) && (
                      <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {[b.city, b.province].filter(Boolean).join(", ")}
                      </div>
                    )}
                    {b.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{b.description}</p>
                    )}
                    <div className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3 w-3 text-primary" /> {t("browse.newListing")}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
