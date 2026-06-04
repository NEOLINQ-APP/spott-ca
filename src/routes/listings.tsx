import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ListingCard } from "@/components/ListingCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { listUnifiedListings } from "@/lib/listings-unified.functions";

// Unified "Listings" entry point. Spott is one platform — /listings is the
// canonical browse URL that shows BOTH marketplace items and vehicles, all
// built from the same BaseListing schema (see src/lib/listing-schema.ts).
export const Route = createFileRoute("/listings")({
  head: () => ({
    meta: [
      { title: "Browse listings — Spott" },
      {
        name: "description",
        content:
          "Browse everything on Spott — marketplace items, services, and vehicles — in one unified feed.",
      },
      { tagName: "link", rel: "canonical", href: "https://spott.ca/listings" },
    ],
  }),
  component: ListingsPage,
});

type Kind = "all" | "marketplace" | "vehicle";

function ListingsPage() {
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<Kind>("all");
  const list = useServerFn(listUnifiedListings);

  const { data, isLoading } = useQuery({
    queryKey: ["unified-listings", { q, kind }],
    queryFn: () => list({ data: { q: q || undefined, kind, limit: 48 } }),
  });

  const listings = data?.listings ?? [];

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Browse listings</h1>
        <p className="text-muted-foreground">
          Everything on Spott — items, services, and vehicles — in one place.
        </p>
      </header>

      <div className="flex flex-col sm:flex-row gap-2 mb-6">
        <Input
          placeholder="Search listings…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="sm:max-w-sm"
        />
        <div className="flex gap-2">
          {(["all", "marketplace", "vehicle"] as Kind[]).map((k) => (
            <Button
              key={k}
              variant={kind === k ? "default" : "outline"}
              size="sm"
              onClick={() => setKind(k)}
            >
              {k === "all" ? "All" : k === "marketplace" ? "Marketplace" : "Vehicles"}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-muted-foreground">Loading…</div>
      ) : listings.length === 0 ? (
        <div className="text-muted-foreground">No listings found.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {listings.map((l) => (
            <ListingCard key={`${l.kind}:${l.id}`} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}
