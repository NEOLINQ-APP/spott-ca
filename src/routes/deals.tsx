import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Tag, Clock, MapPin } from "lucide-react";

export const Route = createFileRoute("/deals")({
  head: () => ({
    meta: [
      { title: "Deals & Specials — Spott.ca" },
      { name: "description", content: "Browse the latest local deals, discounts, and specials from businesses across Canada on Spott.ca." },
      { property: "og:title", content: "Deals & Specials — Spott.ca" },
      { property: "og:description", content: "Latest local deals and discounts from businesses across Canada." },
    ],
  }),
  component: DealsPage,
});

type Deal = {
  id: string;
  title: string;
  description: string | null;
  discount_label: string | null;
  ends_at: string | null;
  business_id: string;
  business: { name: string; slug: string; city: string | null; province: string | null } | null;
};

function DealsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["deals", "active"],
    queryFn: async (): Promise<Deal[]> => {
      const { data, error } = await supabase
        .from("specials")
        .select("id,title,description,discount_label,ends_at,business_id,businesses(name,slug,city,province)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(120);
      if (error) throw error;
      const now = new Date();
      return ((data ?? []) as any[])
        .filter((d) => !d.ends_at || new Date(d.ends_at) > now)
        .map((d) => ({ ...d, business: d.businesses })) as Deal[];
    },
  });

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 pb-24 md:pb-12">
      <header className="mb-6">
        <h1 className="font-display text-3xl font-semibold flex items-center gap-2">
          <Tag className="h-7 w-7 text-primary" /> Deals & Specials
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Fresh discounts and limited-time offers from local Canadian businesses.
        </p>
      </header>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading deals…</p>
      ) : (data?.length ?? 0) === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="text-sm text-muted-foreground">No active deals right now. Check back soon!</p>
          <Link to="/marketplace" className="mt-4 inline-flex text-sm font-medium text-primary hover:underline">
            Browse the marketplace →
          </Link>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data!.map((d) => (
            <Link
              key={d.id}
              to="/business/$slug"
              params={{ slug: d.business?.slug ?? "" }}
              className="group rounded-xl border border-primary/30 bg-primary/5 p-4 transition hover:border-primary hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium group-hover:text-primary">{d.title}</h3>
                {d.discount_label && (
                  <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                    {d.discount_label}
                  </span>
                )}
              </div>
              {d.description && (
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{d.description}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {d.business?.name && <span className="font-medium text-foreground">{d.business.name}</span>}
                {d.business?.city && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {d.business.city}
                    {d.business.province ? `, ${d.business.province}` : ""}
                  </span>
                )}
                {d.ends_at && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" /> ends {new Date(d.ends_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
