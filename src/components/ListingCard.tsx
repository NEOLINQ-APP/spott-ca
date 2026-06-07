import { Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  type BaseListing,
  formatListingLocation,
  formatListingPrice,
  sellerBadgeLabel,
} from "@/lib/listing-schema";

interface ListingCardProps {
  listing: BaseListing;
  className?: string;
}

/**
 * Unified listing card — renders ANY listing (marketplace item or vehicle)
 * built from the shared BaseListing shape. There is only one card component
 * across Spott; vehicle-specific lines (year/make/model, mileage) come from
 * the `extensions.vehicle` field.
 */
export function ListingCard({ listing, className }: ListingCardProps) {
  const cover = listing.images[0]?.url;
  const v = listing.extensions?.vehicle;
  const titleLine = v
    ? [v.year, v.make, v.model].filter(Boolean).join(" ") || listing.title
    : listing.title;
  const priceLine = listing.kind === "business" ? "Business listing" : formatListingPrice(listing);

  return (
      <Card className={`overflow-hidden hover:shadow-lg transition-shadow h-full ${className ?? ""}`}>
        <Link to={listing.href} aria-label={`View ${titleLine}`}>
        <div className="aspect-[4/3] bg-muted relative">
          {cover ? (
            <img
              src={cover}
              alt={titleLine}
              loading="lazy"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm">
              No image
            </div>
          )}
          <Badge
            variant={listing.seller.type === "dealer" ? "default" : "secondary"}
            className="absolute top-2 left-2"
          >
            {sellerBadgeLabel(listing.seller)}
          </Badge>
        </div>
        </Link>
        <CardContent className="p-3 space-y-1">
          <Link to={listing.href} className="block font-semibold line-clamp-1 hover:text-primary">
            {titleLine}
          </Link>
          <div className="text-primary font-bold">{priceLine}</div>
          {v?.mileage_km != null && (
            <div className="text-xs text-muted-foreground">
              {v.mileage_km.toLocaleString()} km
            </div>
          )}
          <div className="text-xs text-muted-foreground line-clamp-1">
            {formatListingLocation(listing) || "—"}
          </div>
          {listing.kind === "business" && listing.seller.slug && (
            <Link
              to="/claim/$slug"
              params={{ slug: listing.seller.slug }}
              className="mt-2 inline-flex rounded-md border border-primary/30 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10"
            >
              {listing.is_claimed ? "Claimed listing" : "Claim listing"}
            </Link>
          )}
        </CardContent>
      </Card>
  );
}
