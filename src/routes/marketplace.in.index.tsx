import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { listCityPages, listProvincePages } from "@/lib/city-pages";

export const Route = createFileRoute("/marketplace/in/")({
  head: () => {
    const title = "Marketplace by Province & City — Spott.ca";
    const description =
      "Browse Spott Marketplace listings in every Canadian province, territory and major city. Buy, sell and trade locally.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
      ],
      links: [{ rel: "canonical", href: "https://www.spott.ca/marketplace/in" }],
    };
  },
  component: LocationsIndex,
});

function LocationsIndex() {
  const cities = listCityPages();
  return (
    <main className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="font-display text-3xl font-semibold">Marketplace by province &amp; city</h1>
      <p className="mt-2 text-muted-foreground">Local listings across Canada.</p>
      <div className="mt-8 space-y-8">
        {listProvincePages().map((p) => (
          <section key={p.code}>
            <h2 className="font-display text-xl font-semibold">
              <Link to="/marketplace/in/$slug" params={{ slug: p.slug }} className="hover:underline">
                {p.name}
              </Link>
            </h2>
            <ul className="mt-3 flex flex-wrap gap-2">
              {cities
                .filter((c) => c.province === p.code)
                .map((c) => (
                  <li key={c.slug}>
                    <Link
                      to="/marketplace/in/$slug"
                      params={{ slug: c.slug }}
                      className="inline-flex items-center gap-1 rounded-full border border-border bg-card px-3 py-1.5 text-sm hover:bg-accent/10"
                    >
                      <MapPin className="h-3 w-3 text-muted-foreground" /> {c.name}
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </main>
  );
}
