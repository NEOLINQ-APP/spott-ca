// Server-only: fetches business listings from Google Places API via the
// Lovable connector gateway. Uses Places API (New) — Text Search v1.
// Docs: https://developers.google.com/maps/documentation/places/web-service/text-search
import { normalizePhone, websiteHost } from "./normalize";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";
const DIRECT_URL = "https://places.googleapis.com";

type PlaceV1 = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  addressComponents?: Array<{ longText: string; shortText: string; types: string[] }>;
  location?: { latitude: number; longitude: number };
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  types?: string[];
  primaryType?: string;
  rating?: number;
  userRatingCount?: number;
  photos?: Array<{ name: string }>;
  regularOpeningHours?: { weekdayDescriptions?: string[] };
};

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.addressComponents",
  "places.location",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.types",
  "places.primaryType",
  "places.rating",
  "places.userRatingCount",
  "places.photos",
  "places.regularOpeningHours",
].join(",");

function headers() {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const GOOGLE_MAPS_API_KEY =
    process.env.GOOGLE_MAPS_API_KEY_1 ?? process.env.GOOGLE_MAPS_API_KEY;
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");
  if (!GOOGLE_MAPS_API_KEY) throw new Error("GOOGLE_MAPS_API_KEY is not configured");
  return {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    "X-Connection-Api-Key": GOOGLE_MAPS_API_KEY,
    "Content-Type": "application/json",
    "X-Goog-FieldMask": FIELD_MASK,
  };
}

/** Text search — up to 20 results per page, up to 3 pages (~60). */
export async function fetchGooglePlaces(query: string, limit = 60): Promise<PlaceV1[]> {
  const out: PlaceV1[] = [];
  let pageToken: string | undefined;
  for (let i = 0; i < 3 && out.length < limit; i++) {
    const body: Record<string, unknown> = { textQuery: query, pageSize: 20 };
    if (pageToken) body.pageToken = pageToken;
    const res = await fetch(`${GATEWAY_URL}/places/v1/places:searchText`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Google Places searchText ${res.status}: ${text.slice(0, 300)}`);
    }
    const json = (await res.json()) as { places?: PlaceV1[]; nextPageToken?: string };
    for (const p of json.places ?? []) out.push(p);
    if (!json.nextPageToken) break;
    pageToken = json.nextPageToken;
    // Google requires a brief delay before the next page is valid.
    await new Promise((r) => setTimeout(r, 1500));
  }
  return out.slice(0, limit);
}

/** Returns a public photo URL routed through the connector gateway. */
function photoUrl(photoName: string | undefined): string | null {
  if (!photoName) return null;
  // Photo media endpoint: /v1/{name}/media?maxWidthPx=...
  // We embed the gateway path; callers will need auth headers to actually load.
  // For storage purposes we keep the raw `name` reference and resolve at render time.
  return photoName;
}

function pickAddrComponent(p: PlaceV1, type: string): string | null {
  const c = p.addressComponents?.find((c) => c.types.includes(type));
  return c?.longText ?? null;
}

export function placeToStaged(
  p: PlaceV1,
  fallbackCity: string,
  fallbackProvince: string,
  categorySlug: string,
) {
  const name = p.displayName?.text;
  if (!name) return null;

  const phone = p.nationalPhoneNumber ?? p.internationalPhoneNumber ?? null;
  const website = p.websiteUri ?? null;

  const city =
    pickAddrComponent(p, "locality") ?? pickAddrComponent(p, "postal_town") ?? fallbackCity;
  const province =
    pickAddrComponent(p, "administrative_area_level_1") ?? fallbackProvince;
  const postal = pickAddrComponent(p, "postal_code");

  const keywords = Array.from(
    new Set([p.primaryType, ...(p.types ?? [])].filter(Boolean) as string[]),
  )
    .map((k) => k.replace(/_/g, " "))
    .slice(0, 12);

  return {
    source: "google_places",
    source_ref: p.id,
    raw: p as any,
    name,
    address: p.formattedAddress ?? null,
    city,
    province,
    postal_code: postal,
    phone,
    phone_normalized: normalizePhone(phone),
    website,
    website_host: websiteHost(website),
    email: null,
    latitude: p.location?.latitude ?? null,
    longitude: p.location?.longitude ?? null,
    hours: p.regularOpeningHours?.weekdayDescriptions
      ? { weekday: p.regularOpeningHours.weekdayDescriptions }
      : null,
    social_links: {},
    keywords,
    category_slug: categorySlug,
    // Stash the first photo reference so the enrichment step can promote it
    // to hero_image_url later.
    notes: photoUrl(p.photos?.[0]?.name),
  };
}
