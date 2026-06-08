import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { listCityPages } from "@/lib/city-pages";
import { PROVINCES } from "@/lib/canadian-cities";

export const Route = createFileRoute("/cities")({
  component: CitiesIndex,
  head: () => ({
    meta: [
      { title: "Browse Businesses by City — Spott.ca" },
      {
        name: "description",
        content:
          "Find local businesses by city across Canada. Browse verified restaurants, salons, mechanics, dealerships and more in every major Canadian city on Spott.ca.",
      },
      { property: "og:title", content: "Browse Businesses by City — Spott.ca" },
      {
        property: "og:description",
        content: "Find local businesses in every major Canadian city.",
      },
      { property: "og:url", content: "https://www.spott.ca/cities" },
    ],
    links: [{ rel: "canonical", href: "https://www.spott.ca/cities" }],
  }),
});

function CitiesIndex() {
  const cities = listCityPages();
  const byProvince = new Map<string, typeof cities>();
  for (const c of cities) {
    const list = byProvince.get(c.province) ?? [];
    list.push(c);
    byProvince.set(c.province, list);
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <header className="mb-10">
          <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Browse businesses by city
          </h1>
          <p className="mt-3 max-w-2xl text-base text-muted-foreground">
            Discover verified local businesses in every major Canadian city. Pick a city below to
            explore restaurants, salons, mechanics, dealerships and more on Spott.ca.
          </p>
        </header>

        <div className="space-y-10">
          {PROVINCES.map((p) => {
            const list = byProvince.get(p.code);
            if (!list?.length) return null;
            return (
              <section key={p.code}>
                <h2 className="font-display text-xl font-semibold">{p.name}</h2>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {list.map((c) => (
                    <li key={c.slug}>
                      <Link
                        to="/city/$slug"
                        params={{ slug: c.slug }}
                        className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-accent/10"
                      >
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <span>
                          {c.name}, {c.province}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
