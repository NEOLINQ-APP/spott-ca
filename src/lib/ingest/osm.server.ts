// Server-only: fetches from OpenStreetMap Overpass API.
// Attribution required when displaying data: © OpenStreetMap contributors, ODbL.
import { normalizePhone, websiteHost } from "./normalize";

const CITY_BBOX: Record<string, [number, number, number, number]> = {
  // [south, west, north, east]
  Edmonton: [53.39, -113.71, 53.71, -113.28],
  Calgary: [50.84, -114.32, 51.21, -113.86],
};

export type OsmElement = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

export async function fetchOsm(
  city: string,
  filter: string, // e.g. "amenity=restaurant"
  limit = 200,
): Promise<OsmElement[]> {
  const bbox = CITY_BBOX[city];
  if (!bbox) throw new Error(`No bbox for city ${city}`);
  const [s, w, n, e] = bbox;
  const [k, v] = filter.split("=");
  const query = `
    [out:json][timeout:60];
    (
      node["${k}"="${v}"](${s},${w},${n},${e});
      way["${k}"="${v}"](${s},${w},${n},${e});
    );
    out center tags ${limit};
  `;
  const res = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}: ${await res.text()}`);
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
    raw: el as unknown as Record<string, unknown>,
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
