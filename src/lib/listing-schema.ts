// ============================================================================
// Unified Spott Listing Schema
// ----------------------------------------------------------------------------
// Spott is one platform with a single listing architecture. Every listing —
// whether it's a vintage chair, a service, or a 2019 Honda Civic — conforms
// to the BaseListing shape below. Specialized listing kinds (vehicles, etc.)
// extend the base via the `extensions` field, NOT a parallel system.
//
// This module also exports adapters that map our existing database rows
// (`marketplace_listings`, `vehicles`) into the unified shape so cards,
// detail pages, and search results all consume the same interface.
// ============================================================================

export type SellerType = "private" | "dealer" | "business";
export type ListingStatus = "active" | "draft" | "pending" | "sold" | "expired" | "archived";
export type ListingKind = "marketplace" | "vehicle";

export interface ListingImage {
  url: string;
  sort_order: number;
}

export interface ListingLocation {
  city: string | null;
  province: string | null;
  postal_code?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface ListingSeller {
  id: string;
  type: SellerType;
  // Dealer / business name + slug when applicable (for "Verified Dealer" badge etc.)
  name?: string | null;
  slug?: string | null;
}

/** Vehicle-specific fields that extend the base listing. */
export interface VehicleExtension {
  year: number | null;
  make: string | null;
  model: string | null;
  trim?: string | null;
  mileage_km: number | null;
  condition: string | null;
  transmission?: string | null;
  fuel_type?: string | null;
  drivetrain?: string | null;
  body_type?: string | null;
  exterior_color?: string | null;
  vin?: string | null;
}

/** The core listing shape that every listing in Spott conforms to. */
export interface BaseListing {
  id: string;
  kind: ListingKind;
  title: string;
  description: string | null;
  price_cents: number;
  currency: string;
  category: string | null; // category slug or label
  location: ListingLocation;
  images: ListingImage[];
  seller: ListingSeller;
  status: ListingStatus;
  created_at: string;
  // Canonical detail URL within the unified Spott platform.
  href: string;
  // Optional listing-type modifier from the marketplace (sale/trade/free/wanted).
  listing_type?: string | null;
  // Extensions: vehicle adds Vehicle-specific fields. Future kinds add more.
  extensions?: {
    vehicle?: VehicleExtension;
  };
}

// ---------------------------------------------------------------------------
// Adapters
// ---------------------------------------------------------------------------

import { supabase } from "@/integrations/supabase/client";

function marketplacePhotoUrl(path: string): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return supabase.storage.from("marketplace-photos").getPublicUrl(path).data.publicUrl;
}

function vehiclePhotoUrl(path: string): string {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return supabase.storage.from("vehicle-photos").getPublicUrl(path).data.publicUrl;
}

type AnyRow = Record<string, any>;

/** Map a `marketplace_listings` row (with optional joined photos) to BaseListing. */
export function marketplaceRowToListing(row: AnyRow): BaseListing {
  const photos = (row.marketplace_listing_photos ?? row.photos ?? []) as AnyRow[];
  const images: ListingImage[] = photos
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((p, i) => ({ url: marketplacePhotoUrl(p.storage_path), sort_order: p.sort_order ?? i }));

  return {
    id: row.id,
    kind: "marketplace",
    title: row.title,
    description: row.description ?? null,
    price_cents: row.price_cents ?? 0,
    currency: row.currency ?? "CAD",
    category: row.category_slug ?? row.category?.slug ?? row.category_id ?? null,
    location: {
      city: row.city ?? null,
      province: row.province ?? null,
      postal_code: row.postal_code ?? null,
      latitude: row.latitude ?? null,
      longitude: row.longitude ?? null,
    },
    images,
    seller: {
      id: row.user_id,
      type: "private",
    },
    status: (row.status ?? "active") as ListingStatus,
    created_at: row.created_at,
    href: `/marketplace/${row.id}`,
    listing_type: row.listing_type ?? null,
  };
}

/** Map a `vehicles` row (with optional joined photos + dealer) to BaseListing. */
export function vehicleRowToListing(row: AnyRow): BaseListing {
  const photos = (row.vehicle_photos ?? row.photos ?? []) as AnyRow[];
  const images: ListingImage[] = photos
    .slice()
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map((p, i) => ({ url: vehiclePhotoUrl(p.storage_path), sort_order: p.sort_order ?? i }));

  const dealer = row.dealer ?? null;
  const sellerType: SellerType = row.seller_type === "dealer" ? "dealer" : "private";

  const title =
    row.title ??
    [row.year, row.make, row.model].filter(Boolean).join(" ").trim() ??
    "Vehicle";

  return {
    id: row.id,
    kind: "vehicle",
    title,
    description: row.description ?? null,
    price_cents: row.price_cents ?? 0,
    currency: row.currency ?? "CAD",
    category: "vehicles",
    location: {
      city: row.city ?? dealer?.city ?? null,
      province: row.province ?? dealer?.province ?? null,
      postal_code: row.postal_code ?? null,
    },
    images,
    seller: {
      id: row.seller_id,
      type: sellerType,
      name: dealer?.name ?? null,
      slug: dealer?.slug ?? null,
    },
    status: (row.status ?? "active") as ListingStatus,
    created_at: row.created_at,
    href: `/vehicles/${row.id}`,
    extensions: {
      vehicle: {
        year: row.year ?? null,
        make: row.make ?? null,
        model: row.model ?? null,
        trim: row.trim ?? null,
        mileage_km: row.mileage_km ?? null,
        condition: row.condition ?? null,
        transmission: row.transmission ?? null,
        fuel_type: row.fuel_type ?? null,
        drivetrain: row.drivetrain ?? null,
        body_type: row.body_type ?? null,
        exterior_color: row.exterior_color ?? null,
        vin: row.vin ?? null,
      },
    },
  };
}

/** Format a price using the unified rules (handles free/wanted/trade modifiers). */
export function formatListingPrice(l: BaseListing): string {
  if (l.listing_type === "free") return "Free";
  if (l.listing_type === "wanted") return "Wanted";
  if (l.listing_type === "trade" && (!l.price_cents || l.price_cents === 0)) return "Trade";
  const dollars = (l.price_cents ?? 0) / 100;
  return new Intl.NumberFormat("en-CA", {
    style: "currency",
    currency: l.currency || "CAD",
    maximumFractionDigits: 0,
  }).format(dollars);
}

export function formatListingLocation(l: BaseListing): string {
  return [l.location.city, l.location.province].filter(Boolean).join(", ");
}

export function sellerBadgeLabel(seller: ListingSeller): string {
  if (seller.type === "dealer") return "Verified Dealer";
  if (seller.type === "business") return "Business";
  return "Private Seller";
}
