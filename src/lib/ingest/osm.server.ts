// Server-only: fetches from OpenStreetMap Overpass API.
// Attribution required when displaying data: © OpenStreetMap contributors, ODbL.
import { normalizePhone, websiteHost } from "./normalize";

const CITY_BBOX: Record<string, [number, number, number, number]> = {
  // [south, west, north, east]
  Edmonton: [53.39, -113.71, 53.71, -113.28],
  Calgary: [50.84, -114.32, 51.21, -113.86],
  "Red Deer": [52.20, -113.88, 52.32, -113.70],
  Lethbridge: [49.62, -112.92, 49.76, -112.74],
  "Medicine Hat": [50.00, -110.78, 50.10, -110.58],
  "St. Albert": [53.60, -113.71, 53.71, -113.55],
  "Sherwood Park": [53.49, -113.36, 53.58, -113.22],
  "Fort McMurray": [56.66, -111.50, 56.79, -111.30],
  "Grande Prairie": [55.13, -118.85, 55.22, -118.70],
  Airdrie: [51.26, -114.07, 51.34, -113.94],
};

export type OsmElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

/** Build an Overpass tag-filter expression from either:
 *   - simple "key=value" (legacy)
 *   - or an already-formatted Overpass clause: `["key"="value"]`, `["key"~"a|b"]`
 */
function buildTagClause(filter: string): string {
  const trimmed = filter.trim();
  if (trimmed.startsWith("[")) return trimmed;
  const [k, v] = trimmed.split("=");
  return `["${k}"="${v}"]`;
}

export async function fetchOsm(
  city: string,
  filter: string,
  limit = 200,
): Promise<OsmElement[]> {
  const bbox = CITY_BBOX[city];
  if (!bbox) throw new Error(`No bbox for city ${city}`);
  const [s, w, n, e] = bbox;
  const clause = buildTagClause(filter);
  const query = `[out:json][timeout:60];(node${clause}(${s},${w},${n},${e});way${clause}(${s},${w},${n},${e}););out tags center ${limit};`;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Accept": "application/json",
      "User-Agent": "SpottCA/1.0 (contact@spott.ca)",
    },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}: ${(await res.text()).slice(0, 200)}`);
  const json = (await res.json()) as { elements: OsmElement[] };
  return json.elements ?? [];
}


export function osmToStaged(el: OsmElement, city: string, province: string, categorySlug: string) {
  const t = el.tags ?? {};
  const lat = el.lat ?? el.center?.lat ?? null;
  const lng = el.lon ?? el.center?.lon ?? null;
  const name = t.name ?? t["name:en"] ?? null;
  if (!name) return null;

  const street = [t["addr:housenumber"], t["addr:street"]].filter(Boolean).join(" ");
  const address = street || t["addr:full"] || null;
  const phone = t.phone ?? t["contact:phone"] ?? null;
  const website = t.website ?? t["contact:website"] ?? null;
  const email = t.email ?? t["contact:email"] ?? null;

  const social: Record<string, string> = {};
  if (t["contact:facebook"]) social.facebook = t["contact:facebook"];
  if (t["contact:instagram"]) social.instagram = t["contact:instagram"];
  if (t["contact:twitter"]) social.twitter = t["contact:twitter"];

  const cuisine = (t.cuisine ?? "").split(";").filter(Boolean);
  const keywords = Array.from(new Set([...cuisine, t.amenity, t.shop].filter(Boolean) as string[]));

  return {
    source: "osm",
    source_ref: `${el.type}/${el.id}`,
    raw: el as any,
    name,
    address,
    city: t["addr:city"] ?? city,
    province: t["addr:state"] ?? province,
    postal_code: t["addr:postcode"] ?? null,
    phone,
    phone_normalized: normalizePhone(phone),
    website,
    website_host: websiteHost(website),
    email,
    latitude: lat,
    longitude: lng,
    hours: t.opening_hours ? { raw: t.opening_hours } : null,
    social_links: social,
    keywords,
    category_slug: categorySlug,
  };
}
