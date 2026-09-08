export { resolveStoredUrl as eventPhotoUrl } from "./barioStorageUrl";

export const EVENT_CATEGORIES = [
  { value: "music", label: "Music" },
  { value: "sports", label: "Sports" },
  { value: "community", label: "Community" },
  { value: "business", label: "Business" },
  { value: "arts", label: "Arts & Culture" },
  { value: "food", label: "Food & Drink" },
  { value: "family", label: "Family" },
  { value: "charity", label: "Charity" },
  { value: "education", label: "Education" },
  { value: "other", label: "Other" },
] as const;

export function eventCategoryLabel(value: string): string {
  return EVENT_CATEGORIES.find((c) => c.value === value)?.label ?? "Other";
}

export function fmtEventPrice(cents: number | null, currency = "CAD"): string {
  if (cents == null) return "Free";
  if (cents === 0) return "Free";
  return new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 0 }).format(cents / 100);
}

export function fmtEventDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-CA", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

export function fmtEventDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-CA", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
