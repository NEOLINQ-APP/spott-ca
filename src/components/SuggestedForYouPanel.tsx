import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Sparkles, MapPin } from "lucide-react";
import { getSuggestedBusinesses } from "@/lib/friends.functions";

type Suggestion = {
  id: string; slug: string; name: string;
  city: string | null; province: string | null;
  description: string | null; hero_image_url: string | null;
  reasons: string[];
};

export function SuggestedForYouPanel() {
  const fetchSuggestions = useServerFn(getSuggestedBusinesses);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSuggestions({})
      .then((res) => setItems((res?.suggestions ?? []) as Suggestion[]))
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [fetchSuggestions]);

  if (loading) {
    return <div className="mt-4 h-40 animate-pulse rounded-2xl bg-card/60" />;
  }
  if (items.length === 0) return null;

  return (
    <section className="mt-4 rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-5">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg font-semibold">Suggested for you</h2>
      </div>
      <p className="mb-4 text-xs text-muted-foreground">Based on your searches and recent activity.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((b) => (
          <Link
            key={b.id}
            to="/business/$slug"
            params={{ slug: b.slug }}
            className="group block overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/40 hover:shadow-md"
          >
            <div className="aspect-[16/10] w-full overflow-hidden bg-secondary">
              {b.hero_image_url ? (
                <img src={b.hero_image_url} alt={b.name} loading="lazy"
                  className="h-full w-full object-cover transition group-hover:scale-105" />
              ) : (
                <div className="grid h-full w-full place-items-center text-xs text-muted-foreground">No photo</div>
              )}
            </div>
            <div className="p-3">
              <div className="truncate text-sm font-semibold">{b.name}</div>
              {(b.city || b.province) && (
                <div className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {[b.city, b.province].filter(Boolean).join(", ")}
                </div>
              )}
              {b.reasons[0] && (
                <div className="mt-2 inline-block rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {b.reasons[0]}
                </div>
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
