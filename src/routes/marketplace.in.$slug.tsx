import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { MapPin, ArrowRight } from "lucide-react";
import { findCityBySlug, findProvinceBySlug, listCityPages, listProvincePages } from "@/lib/city-pages";
import { getMarketplaceLocationData } from "@/lib/marketplace-locations.functions";

// Programmatic SEO: /marketplace/in/<province-slug> (e.g. "alberta") and
// /marketplace/in/<city-slug> (e.g. "calgary-ab"), covering every province
// and city in canadian-cities.ts. Canada only.
type Place = {
  kind: "province" | "city";
  name: string;
  province: string;
  provinceName: string;
  slug: string;
  city?: string;
};

function resolvePlace(slug: string): Place | null {
  const prov = findProvinceBySlug(slug);
  if (prov) return { kind: "province", name: prov.name, province: prov.code, provinceName: prov.name, slug: prov.slug };
  const city = findCityBySlug(slug);
  if (city) return { kind: "city", name: city.name, province: city.province, provinceName: city.provinceName, slug: city.slug, city: city.name };
  return null;
}

const dataQuery = (p: Place) =>
  queryOptions({
    queryKey: ["marketplace-location", p.slug],
    queryFn: () => getMarketplaceLocationData({ data: { province: p.province, city: p.city } }),
    staleTime: 60 * 60 * 1000,
  });

export const Route = createFileRoute("/marketplace/in/$slug")({
  loader: async ({ params, context }) => {
    const place = resolvePlace(params.slug);
    if (!place) throw notFound();
    await (context as any).queryClient?.ensureQueryData?.(dataQuery(place));
    return { place };
  },
  head: ({ params, loaderData }) => {
    const place = loaderData?.place ?? resolvePlace(params.slug);
    if (!place) return { meta: [{ title: "Marketplace — Spott.ca" }] };
    const where = place.kind === "city" ? `${place.name}, ${place.province}` : place.name;
    const title = `Buy & Sell in ${where} — Local Marketplace | Spott.ca`;
    const description = `Browse local listings in ${place.kind === "city" ? `${place.name}, ${place.provinceName}` : place.name} on Spott Marketplace. Buy, sell and trade locally in Canada — free to post.`;
    const url = `https://www.spott.ca/marketplace/in/${place.slug}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "website" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Marketplace", item: "https://www.spott.ca/marketplace" },
              { "@type": "ListItem", position: 2, name: "Locations", item: "https://www.spott.ca/marketplace/in" },
              { "@type": "ListItem", position: 3, name: where, item: url },
            ],
          }),
        },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <h1 className="font-display text-2xl font-semibold">Location not found</h1>
      <Link to="/marketplace/in" className="mt-4 inline-block text-primary underline">
        Browse all locations
      </Link>
    </div>
  ),
  component: LocationPage,
});

function price(l: { price_cents: number | null; currency: string | null }) {
  if (l.price_cents == null) return "Contact for price";
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: l.currency || "CAD" }).format(l.price_cents / 100);
}

function LocationPage() {
  const { place } = Route.useLoaderData();
  const { data } = useSuspenseQuery(dataQuery(place));
  const where = place.kind === "city" ? `${place.name}, ${place.province}` : place.name;
  const sameProvince = listCityPages().filter((c) => c.province === place.province && c.slug !== place.slug);
  const nearby = place.kind === "city" ? sameProvince.slice(0, 12) : sameProvince;
  const provinceSlug = listProvincePages().find((p) => p.code === place.province)?.slug;

  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <nav className="text-sm text-muted-foreground">
        <Link to="/marketplace" className="hover:underline">Marketplace</Link> ·{" "}
        <Link to="/marketplace/in" className="hover:underline">Locations</Link> · {where}
      </nav>
      <h1 className="mt-3 font-display text-3xl font-semibold">Buy &amp; sell in {where}</h1>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Local listings in {place.kind === "city" ? `${place.name}, ${place.provinceName}` : place.name} on Spott
        Marketplace, Canada&apos;s local marketplace for vehicles, electronics, furniture, services and more.
        Posting is free.
      </p>

      {data.listings.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
          <p className="text-sm text-muted-foreground">No active listings in {where} yet.</p>
          <Link
            to="/marketplace/new"
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            Be the first to post <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-6 text-sm text-muted-foreground">
            {data.total} active listing{data.total === 1 ? "" : "s"}
          </p>
          <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data.listings.map((l) => (
              <li key={l.id}>
                <Link
                  to="/marketplace/$id"
                  params={{ id: l.id }}
                  className="block rounded-xl border border-border bg-card p-4 hover:bg-accent/10"
                >
                  <h2 className="line-clamp-2 font-semibold">{l.title}</h2>
                  <p className="mt-1 font-medium text-primary">{price(l)}</p>
                  <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" /> {l.city}
                    {l.province ? `, ${l.province}` : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      <section className="mt-12">
        <h2 className="font-display text-xl font-semibold">
          {place.kind === "city" ? `More of ${place.provinceName}` : `Cities in ${place.name}`}
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {place.kind === "city" && provinceSlug && (
            <li>
              <Link
                to="/marketplace/in/$slug"
                params={{ slug: provinceSlug }}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:bg-accent/10"
              >
                All of {place.provinceName}
              </Link>
            </li>
          )}
          {nearby.map((c) => (
            <li key={c.slug}>
              <Link
                to="/marketplace/in/$slug"
                params={{ slug: c.slug }}
                className="rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:bg-accent/10"
              >
                {c.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
