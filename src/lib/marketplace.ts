import { supabase } from "@/integrations/supabase/client";

export function photoUrl(path: string): string {
  return supabase.storage.from("marketplace-photos").getPublicUrl(path).data.publicUrl;
}

export function formatPrice(cents: number, currency = "CAD", listingType?: string): string {
  if (listingType === "free") return "Free";
  if (listingType === "wanted") return "Wanted";
  if (listingType === "trade" && (!cents || cents === 0)) return "Trade";
  const dollars = (cents || 0) / 100;
  return new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 0 }).format(dollars);
}

export const CONDITIONS = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like new" },
  { value: "used", label: "Used" },
  { value: "for_parts", label: "For parts / not working" },
] as const;

export const LISTING_TYPES = [
  { value: "sale", label: "For sale" },
  { value: "trade", label: "For trade" },
  { value: "free", label: "Free" },
  { value: "wanted", label: "Wanted" },
] as const;
