// Server-only: fetches business listings from Google Places API via the
// Lovable connector gateway first, with an optional direct key fallback.
// Uses Places API (New) — Text Search v1.
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

function getDirectKey() {
  return process.env.GOOGLE_PLACES_API_KEY?.trim() || null;
}

type SearchTextResponse = { places?: PlaceV1[]; nextPageToken?: string };

type PlacesAttempt = {
  label: string;
  url: string;
  headers: Record<string, string>;
};

function placesAttempts(): PlacesAttempt[] {
  const attempts: PlacesAttempt[] = [];
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const GOOGLE_MAPS_API_KEY =
    process.env.GOOGLE_MAPS_API_KEY_1 ?? process.env.GOOGLE_MAPS_API_KEY;

  if (LOVABLE_API_KEY && GOOGLE_MAPS_API_KEY) {
    attempts.push({
      label: "Google Maps connector",
      url: `${GATEWAY_URL}/places/v1/places:searchText`,
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": GOOGLE_MAPS_API_KEY,
        "Content-Type": "application/json",
        "X-Goog-FieldMask": FIELD_MASK,
      },
    });
  }

  const directKey = getDirectKey();
  if (directKey) {
    attempts.push({
      label: "GOOGLE_PLACES_API_KEY",
      url: `${DIRECT_URL}/v1/places:searchText`,
      headers: {
        "X-Goog-Api-Key": directKey,
        "Content-Type": "application/json",
        "X-Goog-FieldMask": FIELD_MASK,
      },
    });
  }

  if (attempts.length === 0) {
    throw new Error("Google Places is not configured: add a Google Maps connector or GOOGLE_PLACES_API_KEY.");
  }

  return attempts;
}

function placesError(status: number, text: string, label: string) {
  let message = text.slice(0, 300);
  try {
    const parsed = JSON.parse(text) as { error?: { message?: string; status?: string; details?: Array<{ reason?: string }> } };
    const reason = parsed.error?.details?.find((d) => d.reason)?.reason;
    message = [parsed.error?.message, parsed.error?.status, reason].filter(Boolean).join(" · ");
  } catch {
    // Keep the trimmed text fallback for non-JSON gateway errors.
  }

  if (status === 403 && message.includes("API_KEY")) {
    return `${label} is blocked from Places Text Search. Enable Places API (New) for that Google Cloud project and use a server-safe key with API restrictions allowing Places API.`;
  }

  return `${label} Places Text Search failed (${status}): ${message}`;
}

async function searchText(body: Record<string, unknown>): Promise<SearchTextResponse> {
  const errors: string[] = [];
  for (const attempt of placesAttempts()) {
    const res = await fetch(attempt.url, {
      method: "POST",
      headers: attempt.headers,
      body: JSON.stringify(body),
    });
    if (res.ok) return (await res.json()) as SearchTextResponse;

    const text = await res.text();
    errors.push(placesError(res.status, text, attempt.label));
  }

  throw new Error(errors.at(-1) ?? "Google Places Text Search failed.");
}

/** Text search — up to 20 results per page, up to 3 pages (~60). */
export async function fetchGooglePlaces(query: string, limit = 60): Promise<PlaceV1[]> {
  const out: PlaceV1[] = [];
  let pageToken: string | undefined;
  for (let i = 0; i < 3 && out.length < limit; i++) {
    const body: Record<string, unknown> = { textQuery: query, pageSize: 20 };
    if (pageToken) body.pageToken = pageToken;
    const json = await searchText(body);
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
