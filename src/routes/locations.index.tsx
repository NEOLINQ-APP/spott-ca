import { createFileRoute, Link } from "@tanstack/react-router";
import { MapPin } from "lucide-react";
import { listProvincePages } from "@/lib/city-pages";

export const Route = createFileRoute("/locations/")({
  component: LocationsIndex,
  head: () => ({
    meta: [
      { title: "Vehicle Financing by Province — Spott Auto" },
      { name: "description", content: "Find vehicle financing and dealership partners across Canada with Spott Auto. Browse by province." },
      { property: "og:title", content: "Vehicle Financing by Province — Spott Auto" },
      { property: "og:url", content: "https://www.spott.ca/locations" },
    ],
    links: [{ rel: "canonical", href: "https://www.spott.ca/locations" }],
  }),
});

function LocationsIndex() {
  const provinces = listProvincePages();
  return (
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
      <header className="mb-10">
        <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">Spott Auto by province</h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          Vehicle listings, dealership partners, and financing applications across Canada. Pick a province to see what's available near you.
        </p>
      </header>
      <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {provinces.map((p) => (
          <li key={p.slug}>
            <Link
              to="/locations/$province"
              params={{ province: p.slug }}
              className="flex items-center gap-2 rounded-md border border-border bg-card px-4 py-3 text-sm hover:bg-accent/10"
            >
              <MapPin className="h-4 w-4 text-muted-foreground" />
              {p.name}
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
