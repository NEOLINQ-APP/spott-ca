import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listDealerInventoryBySlug } from "@/lib/vehicles.functions";
import { vehicleRowToListing } from "@/lib/listing-schema";
import { ListingCard } from "@/components/ListingCard";
import { Button } from "@/components/ui/button";
import { Phone, Globe, MapPin, ArrowLeft } from "lucide-react";
import { VerificationBadge } from "@/components/VerificationBadge";

// Public dealer inventory page. Listed inventory is always seller_type=dealer
// (enforced server-side in listDealerInventoryBySlug). Private sellers don't
// have an inventory page — they don't appear here.
export const Route = createFileRoute("/vehicles/dealer/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `Dealer inventory — Spott` },
      { tagName: "link", rel: "canonical", href: `https://spott.ca/vehicles/dealer/${params.slug}` },
    ],
  }),
  component: DealerInventoryPage,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-rose-600">Couldn't load this dealer: {error.message}</div>
  ),
  notFoundComponent: () => (
    <div className="p-8 text-sm text-muted-foreground">Dealer not found.</div>
  ),
});

function DealerInventoryPage() {
  const { slug } = useParams({ from: "/vehicles/dealer/$slug" });
  const fetchInventory = useServerFn(listDealerInventoryBySlug);

  const { data, isLoading } = useQuery({
    queryKey: ["dealer-inventory", slug],
    queryFn: () => fetchInventory({ data: { slug } }),
    staleTime: 60_000,
  });

  if (isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading inventory…</div>;
  }
  if (!data?.dealer) {
    return <div className="p-8 text-sm text-muted-foreground">Dealer not found.</div>;
  }

  const dealer = data.dealer;
  const listings = (data.vehicles ?? []).map((v) => vehicleRowToListing(v as any));

  return (
    <div className="container mx-auto px-4 py-6">
      <Link
        to="/vehicles/browse"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to vehicles
      </Link>

      <header className="mt-4 grid gap-6 lg:grid-cols-[1fr_auto] items-start rounded-2xl border border-border bg-card p-6">
        <div className="flex gap-4 items-start">
          {dealer.hero_image_url && (
            <img
              src={dealer.hero_image_url}
              alt={dealer.name}
              className="h-20 w-20 rounded-xl object-cover"
            />
          )}
          <div>
            <VerificationBadge type="verified-dealer" size="sm" />
            <h1 className="mt-2 font-display text-3xl font-semibold">{dealer.name}</h1>
            {(dealer.city || dealer.province) && (
              <div className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {[dealer.city, dealer.province].filter(Boolean).join(", ")}
              </div>
            )}
            {dealer.description && (
              <p className="mt-3 max-w-2xl text-sm text-foreground/90">{dealer.description}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <Link to="/business/$slug" params={{ slug: dealer.slug }}>
            <Button className="w-full">View dealer profile</Button>
          </Link>
          {dealer.phone && (
            <a href={`tel:${dealer.phone}`} className="w-full">
              <Button variant="outline" className="w-full">
                <Phone className="mr-1 h-4 w-4" /> Call
              </Button>
            </a>
          )}
          {dealer.website && (
            <a href={dealer.website} target="_blank" rel="noreferrer" className="w-full">
              <Button variant="outline" className="w-full">
                <Globe className="mr-1 h-4 w-4" /> Website
              </Button>
            </a>
          )}
        </div>
      </header>

      <h2 className="mt-8 mb-3 text-xl font-semibold">
        Inventory <span className="text-muted-foreground font-normal">({listings.length})</span>
      </h2>

      {listings.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          No vehicles currently listed by this dealer.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {listings.map((l) => (
            <ListingCard key={l.id} listing={l} />
          ))}
        </div>
      )}
    </div>
  );
}
