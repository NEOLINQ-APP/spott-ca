import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { putObject } from "@/lib/barioStorage.server";
import { z } from "zod";

async function assertAdmin(supabase: any, userId: string) {
  const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  const isAdmin = (roles ?? []).some((r: any) => r.role === "admin");
  if (!isAdmin) throw new Error("Not authorized");
}

async function fetchOnePhotoForBusiness(
  apiKey: string,
  biz: { id: string; name: string; address: string | null; city: string | null; province: string | null },
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
  const place = searchJson?.places?.[0];
  const photoName: string | undefined = place?.photos?.[0]?.name;
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

export const backfillGooglePhotos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) =>
    z.object({
      limit: z.number().int().min(1).max(50).default(15),
      onlyMissing: z.boolean().default(true),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertAdmin(supabase, userId);

    // GOOGLE_PLACES_API_KEY preferred: unrestricted server key (the Maps
    // keys are browser/referrer-restricted and fail server calls).
    const apiKey =
      process.env.GOOGLE_PLACES_API_KEY ?? process.env.GOOGLE_MAPS_API_KEY_1 ?? process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) throw new Error("Google Maps is not configured");

    // Find candidates: blank or unsplash placeholder
    let query = supabaseAdmin
      .from("businesses")
      .select("id,name,address,city,province,hero_image_url")
      .limit(data.limit);
    if (data.onlyMissing) {
      query = query.or("hero_image_url.is.null,hero_image_url.eq.,hero_image_url.ilike.%unsplash%");
    }
    const { data: rows, error } = await query;
    if (error) throw new Error(error.message);
    const candidates = rows ?? [];

    let updated = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const biz of candidates) {
      try {
        const photo = await fetchOnePhotoForBusiness(apiKey, biz as any);
        if (!photo) {
          skipped++;
          continue;
        }
        const ext = photo.contentType.includes("png") ? "png" : "jpg";
        const uploaded = await putObject(
          "spott/images/business",
          `${biz.id}-google.${ext}`,
          photo.bytes,
          photo.contentType,
        ).catch((e) => {
          errors.push(`${biz.name}: upload ${e instanceof Error ? e.message : String(e)}`);
          return null;
        });
        if (!uploaded) continue;
        const { publicUrl, key } = uploaded;

        await supabaseAdmin.from("businesses").update({ hero_image_url: publicUrl }).eq("id", biz.id);
        await supabaseAdmin.from("business_photos").insert({
          business_id: biz.id,
          storage_path: key,
          sort_order: 0,
          caption: "From Google",
        }).then(() => {}, () => {});
        updated++;
      } catch (e: any) {
        errors.push(`${biz.name}: ${e?.message ?? "error"}`);
      }
    }

    return { processed: candidates.length, updated, skipped, errors: errors.slice(0, 5) };
  });
