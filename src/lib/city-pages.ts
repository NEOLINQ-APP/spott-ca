// Shared helpers for SEO city pages.
// Slug format: "<city>-<province>" e.g. "calgary-ab", "saint-john-nb".
// Province suffix disambiguates duplicate city names across provinces.

import { CITIES, PROVINCES } from "@/lib/canadian-cities";

export function citySlugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export function cityPageSlug(name: string, province: string): string {
  return `${citySlugify(name)}-${province.toLowerCase()}`;
}

export interface CityRef {
  name: string;
  province: string;
  provinceName: string;
  slug: string;
}

export function listCityPages(): CityRef[] {
  return CITIES.map((c) => {
    const prov = PROVINCES.find((p) => p.code === c.province);
    return {
      name: c.name,
      province: c.province,
      provinceName: prov?.name ?? c.province,
      slug: cityPageSlug(c.name, c.province),
    };
  });
}

export function findCityBySlug(slug: string): CityRef | null {
  const all = listCityPages();
  return all.find((c) => c.slug === slug.toLowerCase()) ?? null;
}
