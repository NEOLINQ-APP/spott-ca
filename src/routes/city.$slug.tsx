import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery, queryOptions } from "@tanstack/react-query";
import { MapPin, Star, ShieldCheck, Sparkles, ArrowRight, Building2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { findCityBySlug } from "@/lib/city-pages";
import { getCityPageData } from "@/lib/city-pages.functions";
import { VerificationBadge } from "@/components/VerificationBadge";

const cityQuery = (city: string, province: string) =>
  queryOptions({
    queryKey: ["city-page", city, province],
    queryFn: () => getCityPageData({ data: { city, province } }),
    staleTime: 60 * 60 * 1000, // 1 hour
  });

export const Route = createFileRoute("/city/$slug")({
  loader: async ({ params, context }) => {
    const city = findCityBySlug(params.slug);
    if (!city) throw notFound();
    await (context as any).queryClient?.ensureQueryData?.(
      cityQuery(city.name, city.province),
    );
    return { city };
  },
  head: ({ params, loaderData }) => {
    const city = loaderData?.city ?? findCityBySlug(params.slug);
    if (!city) return { meta: [{ title: "City — Spott.ca" }] };
    const title = `Best Businesses in ${city.name}, ${city.province} — Spott.ca`;
    const description = `Discover top-rated, verified businesses in ${city.name}, ${city.provinceName}. Restaurants, salons, mechanics, dealerships and more — all on Spott.ca, Canada's modern business directory.`;
    const url = `https://www.spott.ca/city/${city.slug}`;
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
              { "@type": "ListItem", position: 1, name: "Spott.ca", item: "https://www.spott.ca" },
              { "@type": "ListItem", position: 2, name: "Cities", item: "https://www.spott.ca/cities" },
              { "@type": "ListItem", position: 3, name: `${city.name}, ${city.province}`, item: url },
            ],
          }),
        },
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Place",
            name: `${city.name}, ${city.provinceName}`,
            address: {
              "@type": "PostalAddress",
              addressLocality: city.name,
              addressRegion: city.province,
              addressCountry: "CA",
            },
          }),
        },
      ],
    };
  },
  component: CityPage,
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="font-display text-2xl font-semibold">City not found</h1>
        <p className="mt-2 text-muted-foreground">We don't have a page for this city yet.</p>
        <Link to="/cities" className="mt-4 inline-block text-primary hover:underline">
          Browse all cities
        </Link>
      </div>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen flex items-center justify-center p-6 text-center">
      <div>
        <h1 className="font-display text-2xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{(error as Error)?.message ?? "Please try again."}</p>
      </div>
    </div>
  ),
});

function CityPage() {
  const { city } = Route.useLoaderData();
  const { data } = useSuspenseQuery(cityQuery(city.name, city.province));

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        {/* Hero */}
        <header className="border-b border-border bg-gradient-to-b from-primary/10 via-background to-background">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
            <nav className="flex items-center gap-2 text-xs text-muted-foreground">
              <Link to="/" className="hover:underline">Spott.ca</Link>
              <span>/</span>
              <Link to="/cities" className="hover:underline">Cities</Link>
              <span>/</span>
              <span>{city.name}, {city.province}</span>
            </nav>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              Best Businesses in {city.name}, {city.province}
            </h1>
            <p className="mt-3 max-w-2xl text-base text-muted-foreground">
              {data.total > 0 ? (
                <>
                  Discover <strong>{data.total.toLocaleString()}</strong> verified local businesses
                  in {city.name}, {city.provinceName}. Restaurants, salons, mechanics, dealerships,
                  realtors and more.
                </>
              ) : (
                <>
                  Be among the first businesses listed in {city.name}, {city.provinceName} on Spott.ca.
                </>
              )}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                to="/business-signup"
                className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
              >
                <Sparkles className="h-4 w-4" /> List your {city.name} business
              </Link>
              <Link
                to="/directory"
                search={{ city: city.name }}
                className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-accent/10"
              >
                Search the full directory <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
          {/* Top categories */}
          {data.topCategories.length > 0 && (
            <section className="mb-10">
              <h2 className="font-display text-xl font-semibold">
                Popular categories in {city.name}
              </h2>
              <div className="mt-4 flex flex-wrap gap-2">
                {data.topCategories.map((c) => (
                  <Link
                    key={c.slug}
                    to="/directory"
                    search={{ city: city.name, q: c.name }}
                    className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:bg-accent/10"
                  >
                    {c.name}
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                      {c.count}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Featured */}
          {data.featured.length > 0 && (
            <section className="mb-12">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-xl font-semibold flex items-center gap-2">
                  <Star className="h-5 w-5 text-primary" /> Featured in {city.name}
                </h2>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.featured.map((b) => (
                  <BusinessCard key={b.id} biz={b} featured />
                ))}
              </div>
            </section>
          )}

          {/* All businesses */}
          <section>
            <h2 className="font-display text-xl font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5" /> All businesses in {city.name}
            </h2>
            {data.businesses.length === 0 ? (
              <div className="mt-6 rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
                <p className="text-sm text-muted-foreground">
                  No businesses listed yet in {city.name}.
                </p>
                <Link
                  to="/business-signup"
                  className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                >
                  Be the first to list
                </Link>
              </div>
            ) : (
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {data.businesses.map((b) => (
                  <BusinessCard key={b.id} biz={b} />
                ))}
              </div>
            )}
          </section>

          {/* SEO body copy */}
          <section className="mt-14 rounded-2xl border border-border bg-card/40 p-6 sm:p-8">
            <h2 className="font-display text-xl font-semibold">
              About {city.name}, {city.provinceName}
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              {city.name} is one of {city.provinceName}'s key local markets. Spott.ca helps residents
              and visitors find trusted businesses with verified profiles, real customer reviews, and
              up-to-date hours, photos and contact info. Whether you're searching for a great
              restaurant, an honest mechanic, a top-rated hair salon, or a local dealership, you'll
              find them on Spott.ca.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              Run a business in {city.name}?{" "}
              <Link to="/for-business" className="text-primary hover:underline">
                See why Canadian businesses choose Spott.ca
              </Link>{" "}
              and{" "}
              <Link to="/business-signup" className="text-primary hover:underline">
                claim your free listing today
              </Link>.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

function BusinessCard({ biz, featured }: { biz: any; featured?: boolean }) {
  return (
    <Link
      to="/business/$slug"
      params={{ slug: biz.slug }}
      className={`group flex flex-col overflow-hidden rounded-2xl border bg-card transition hover:shadow-md ${
        featured ? "border-primary/40 ring-1 ring-primary/20" : "border-border"
      }`}
    >
      <div className="relative aspect-[16/10] bg-muted">
        {biz.hero_image_url ? (
          <img
            src={biz.hero_image_url}
            alt={biz.name}
            className="h-full w-full object-cover transition group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Building2 className="h-10 w-10" />
          </div>
        )}
        {featured && (
          <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
            <Star className="h-3 w-3" /> Featured
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold leading-tight">{biz.name}</h3>
          {biz.is_verified && <VerificationBadge type="verified_business" size="sm" />}
        </div>
        {biz.city && (
          <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3 w-3" />
            {biz.city}, {biz.province}
          </div>
        )}
        {biz.description && (
          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{biz.description}</p>
        )}
      </div>
    </Link>
  );
}
