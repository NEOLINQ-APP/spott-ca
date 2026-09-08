export const EMPLOYMENT_TYPES = [
  { value: "full_time", label: "Full-time" },
  { value: "part_time", label: "Part-time" },
  { value: "contract", label: "Contract" },
  { value: "internship", label: "Internship" },
  { value: "temporary", label: "Temporary" },
] as const;

export const LOCATION_TYPES = [
  { value: "onsite", label: "On-site" },
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
] as const;

export function employmentTypeLabel(value: string): string {
  return EMPLOYMENT_TYPES.find((t) => t.value === value)?.label ?? value;
}

export function locationTypeLabel(value: string): string {
  return LOCATION_TYPES.find((t) => t.value === value)?.label ?? value;
}

export function fmtSalary(minCents: number | null, maxCents: number | null, period: string, currency = "CAD"): string {
  if (minCents == null && maxCents == null) return "Salary not disclosed";
  const fmt = (c: number) => new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 0 }).format(c / 100);
  const suffix = period === "hourly" ? "/hr" : "/yr";
  if (minCents != null && maxCents != null && minCents !== maxCents) return `${fmt(minCents)} – ${fmt(maxCents)}${suffix}`;
  const single = minCents ?? maxCents;
  return single != null ? `${fmt(single)}${suffix}` : "Salary not disclosed";
}

export function fmtPostedDate(iso: string): string {
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return "Posted today";
  if (days === 1) return "Posted yesterday";
  if (days < 30) return `Posted ${days} days ago`;
  return `Posted ${new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}`;
}
