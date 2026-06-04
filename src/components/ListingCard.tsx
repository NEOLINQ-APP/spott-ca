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

  return (
    <Link to={listing.href} className={className}>
      <Card className="overflow-hidden hover:shadow-lg transition-shadow h-full">
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
        <CardContent className="p-3 space-y-1">
          <div className="font-semibold line-clamp-1">{titleLine}</div>
          <div className="text-primary font-bold">{formatListingPrice(listing)}</div>
          {v?.mileage_km != null && (
            <div className="text-xs text-muted-foreground">
              {v.mileage_km.toLocaleString()} km
            </div>
          )}
          <div className="text-xs text-muted-foreground line-clamp-1">
            {formatListingLocation(listing) || "—"}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
