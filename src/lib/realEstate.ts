export { resolveStoredUrl as propertyPhotoUrl } from "./barioStorageUrl";

export const PROPERTY_TYPES = [
  { value: "residential", label: "Residential" },
  { value: "commercial", label: "Commercial" },
  { value: "land", label: "Land" },
  { value: "rental", label: "Rental" },
] as const;

export const LISTING_TYPES = [
  { value: "sale", label: "For Sale" },
  { value: "rent", label: "For Rent" },
] as const;

export function propertyTypeLabel(value: string): string {
  return PROPERTY_TYPES.find((t) => t.value === value)?.label ?? value;
}

export function listingTypeLabel(value: string): string {
  return LISTING_TYPES.find((t) => t.value === value)?.label ?? value;
}

export function fmtPropertyPrice(cents: number, listingType: string, currency = "CAD"): string {
  const amount = new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);
  return listingType === "rent" ? `${amount}/mo` : amount;
}

export function fmtBeds(n: number | null): string {
  if (n == null) return "—";
  return n === 1 ? "1 bed" : `${n} beds`;
}

export function fmtBaths(n: number | null): string {
  if (n == null) return "—";
  return n === 1 ? "1 bath" : `${n} baths`;
}
