// Shared helper: fetch one Google Places photo for a business and store it
// in Bario's own storage backend. Returns the public URL (or null).
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { putObject } from "@/lib/barioStorage.server";

export async function fetchOnePhotoBytes(
  apiKey: string,
  biz: { name: string; address?: string | null; city?: string | null; province?: string | null },
): Promise<{ bytes: Uint8Array; contentType: string } | null> {
  const query = [biz.name, biz.address, biz.city, biz.province, "Canada"].filter(Boolean).join(", ");
  const searchRes = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": "places.id,places.displayName,places.photos",
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 1, regionCode: "CA" }),
  });
  if (!searchRes.ok) return null;
  const searchJson: any = await searchRes.json().catch(() => ({}));
  const photoName: string | undefined = searchJson?.places?.[0]?.photos?.[0]?.name;
  if (!photoName) return null;

  const mediaRes = await fetch(
    `https://places.googleapis.com/v1/${photoName}/media?maxWidthPx=1600&key=${apiKey}`,
    { redirect: "follow" },
  );
  if (!mediaRes.ok) return null;
  const contentType = mediaRes.headers.get("content-type") ?? "image/jpeg";
  const buf = new Uint8Array(await mediaRes.arrayBuffer());
  if (buf.byteLength < 1000) return null;
  return { bytes: buf, contentType };
}

export async function fetchAndStoreGooglePhoto(
  businessId: string,
  biz: { name: string; address?: string | null; city?: string | null; province?: string | null },
): Promise<string | null> {
  // GOOGLE_PLACES_API_KEY first: it's the unrestricted server key. The
  // Maps keys are browser/HTTP-referrer-restricted and 400 on server calls
  // (confirmed live) — checking them first via `??` silently picked the
  // broken key since it's still a truthy string, failing every photo fetch.
  const apiKey = process.env.GOOGLE_PLACES_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY_1 ?? process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return null;

  const photo = await fetchOnePhotoBytes(apiKey, biz);
  if (!photo) return null;

  const ext = photo.contentType.includes("png") ? "png" : "jpg";
  const { publicUrl, key } = await putObject(
    "spott/images/business",
    `${businessId}-google.${ext}`,
    photo.bytes,
    photo.contentType,
  ).catch(() => ({ publicUrl: null, key: null }));
  if (!publicUrl) return null;

  await supabaseAdmin.from("businesses").update({ hero_image_url: publicUrl }).eq("id", businessId);
  await supabaseAdmin
    .from("business_photos")
    .insert({ business_id: businessId, storage_path: key, sort_order: 0, caption: "From Google" })
    .then(() => {}, () => {});

  return publicUrl;
}

// Backfill candidates: blank or unsplash placeholder or clearbit logo.
export async function backfillGooglePhotosBatch(limit: number): Promise<{ processed: number; updated: number }> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY_1 ?? process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) return { processed: 0, updated: 0 };

  const { data: rows } = await supabaseAdmin
    .from("businesses")
    .select("id,name,address,city,province,hero_image_url")
    .or("hero_image_url.is.null,hero_image_url.eq.,hero_image_url.ilike.%unsplash%,hero_image_url.ilike.%clearbit%,hero_image_url.ilike.%logo.clearbit%")
    .eq("status", "approved")
    .limit(limit);

  const candidates = rows ?? [];
  let updated = 0;
  for (const biz of candidates) {
    try {
      const url = await fetchAndStoreGooglePhoto(biz.id, biz as any);
      if (url) updated++;
    } catch (e) {
      console.error("backfill photo failed", biz.id, (e as Error).message);
    }
  }
  return { processed: candidates.length, updated };
}
