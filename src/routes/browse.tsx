import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { Search, MapPin, Star } from "lucide-react";
import { z } from "zod";

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
  city: string | null; hero_image_url: string | null; category_id: string | null;
};

function BrowsePage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [categories, setCategories] = useState<Category[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(search.q ?? "");

  const activeCategory = useMemo(
    () => categories.find((c) => c.slug === search.category),
    [categories, search.category],
  );

  useEffect(() => {
    supabase.from("categories").select("id,slug,name").order("sort_order").then(({ data }) => {
      if (data) setCategories(data);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    let query = supabase
      .from("businesses")
      .select("id,slug,name,description,city,hero_image_url,category_id")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(60);
    if (activeCategory) query = query.eq("category_id", activeCategory.id);
    if (search.q) query = query.ilike("name", `%${search.q}%`);
    if (search.city) query = query.ilike("city", `%${search.city}%`);
    query.then(({ data }) => {
      setBusinesses(data ?? []);
      setLoading(false);
    });
  }, [activeCategory, search.q, search.city]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          {activeCategory ? activeCategory.name : "Browse all businesses"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {businesses.length} {businesses.length === 1 ? "listing" : "listings"}
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            navigate({ to: "/browse", search: { ...search, q: q || undefined } as any });
          }}
          className="mt-6 flex items-center gap-2 rounded-xl border border-white/10 bg-card p-2"
        >
          <Search className="ml-2 h-4 w-4 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by name"
            className="flex-1 bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          <button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition">
            Search
          </button>
        </form>

        {/* Category pills */}
        <div className="mt-6 flex flex-wrap gap-2">
          <Link to="/browse" search={{} as any} className={`rounded-full border px-3 py-1.5 text-xs transition ${!activeCategory ? "border-primary bg-primary/10 text-primary" : "border-white/10 text-muted-foreground hover:text-foreground"}`}>
            All
          </Link>
          {categories.map((c) => (
            <Link
              key={c.id}
              to="/browse"
              search={{ category: c.slug } as any}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${activeCategory?.id === c.id ? "border-primary bg-primary/10 text-primary" : "border-white/10 text-muted-foreground hover:text-foreground"}`}
            >
              {c.name}
            </Link>
          ))}
        </div>

        {/* Results */}
        <div className="mt-10">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-64 animate-pulse rounded-2xl bg-card/60" />
              ))}
            </div>
          ) : businesses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-card/40 p-12 text-center">
              <h3 className="font-display text-lg">No listings yet</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Be the first — sign in and add your business to bario.ca.
              </p>
              <Link to="/auth" className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
                Add a listing
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {businesses.map((b) => (
                <article key={b.id} className="group overflow-hidden rounded-2xl border border-white/10 bg-card transition hover:border-primary/40">
                  <div className="aspect-[16/10] overflow-hidden bg-secondary">
                    {b.hero_image_url ? (
                      <img src={b.hero_image_url} alt={b.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">No photo yet</div>
                    )}
                  </div>
                  <div className="p-5">
                    <h3 className="font-display text-lg font-semibold">{b.name}</h3>
                    {b.city && (
                      <div className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" /> {b.city}
                      </div>
                    )}
                    {b.description && (
                      <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{b.description}</p>
                    )}
                    <div className="mt-3 inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Star className="h-3 w-3 text-primary" /> New listing
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
