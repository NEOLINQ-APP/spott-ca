// Unified listing query — powers /listings. Queries marketplace_listings,
// vehicles (private sellers only per product rules), and businesses
// (services + business directory sections). Returns BaseListing[] so cards
// stay uniform across all sections.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  type BaseListing,
  businessRowToListing,
  marketplaceRowToListing,
  vehicleRowToListing,
} from "./listing-schema";

// Sections shown in the unified feed. Add new ones here as Spott grows.
export const FEED_SECTIONS = [
  "all",
  "marketplace",
  "services",
  "business-directory",
  "vehicles",
] as const;
export type FeedSection = (typeof FEED_SECTIONS)[number];

export const SORT_OPTIONS = [
  "newest",
  "oldest",
  "price_asc",
  "price_desc",
  "distance",
  "most_viewed",
  "featured_first",
] as const;
export type SortOption = (typeof SORT_OPTIONS)[number];

// Categories that belong to the "Services" bucket within the business directory.
// Keep in sync with the public.categories table after the Dec-2026 cleanup.
const SERVICE_CATEGORY_SLUGS = [
  "home-services",
  "professional-services",
  "beauty-personal-care",
  "health-wellness",
  "automotive", // "Auto Services & Dealers"
] as const;

const ListInput = z.object({
  q: z.string().trim().max(120).optional(),
  section: z.enum(FEED_SECTIONS).default("all"),
  // Optional sub-category slug, scoped by `section`:
  //  - marketplace → marketplace_categories.slug
  //  - business-directory / services → categories.slug
  //  - vehicles → ignored (vehicles vertical has its own filters)
  category: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  // Radius + lat/lng support "Near Me". When provided, only listings within
  // `radius_km` of (lat, lng) are returned. We compute distance client-side
  // (haversine) because PostGIS may not be enabled on every table.
  lat: z.number().optional(),
  lng: z.number().optional(),
  radius_km: z.number().min(1).max(500).optional(),
  price_min_cents: z.number().int().min(0).optional(),
  price_max_cents: z.number().int().min(0).optional(),
  sort: z.enum(SORT_OPTIONS).default("newest"),
  limit: z.number().int().min(1).max(120).default(48),
  offset: z.number().int().min(0).max(10000).default(0),
});

function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number | null; lng: number | null },
): number | null {
  if (b.lat == null || b.lng == null) return null;
  const R = 6371;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export const listUnifiedListings = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) => ListInput.parse(input ?? {}))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const out: BaseListing[] = [];
    const cityIlike = data.city ? `%${data.city}%` : null;
    // Fetch a wider page from each source so we can globally sort/filter, then trim.
    const perSource = Math.min(120, data.limit * 2);

    const wantMarketplace = data.section === "all" || data.section === "marketplace";
    const wantServices = data.section === "all" || data.section === "services";
    const wantDirectory = data.section === "all" || data.section === "business-directory";
    const wantVehicles = data.section === "all" || data.section === "vehicles";

    // Resolve category slug → id per taxonomy (only when section is specific).
    let mpCategoryId: string | null = null;
    let bizCategoryId: string | null = null;
    if (data.category) {
      if (data.section === "marketplace") {
        const { data: row } = await supabaseAdmin
          .from("marketplace_categories")
          .select("id")
          .eq("slug", data.category)
          .maybeSingle();
        mpCategoryId = (row as any)?.id ?? null;
      } else if (data.section === "business-directory" || data.section === "services") {
        const { data: row } = await supabaseAdmin
          .from("categories")
          .select("id")
          .eq("slug", data.category)
          .maybeSingle();
        bizCategoryId = (row as any)?.id ?? null;
      }
    }

    // -------- marketplace_listings --------
    if (wantMarketplace) {
      let q = supabaseAdmin
        .from("marketplace_listings")
        .select(
          "id,title,description,price_cents,currency,city,province,postal_code,latitude,longitude,status,listing_type,user_id,created_at,view_count,category_id,marketplace_listing_photos(storage_path,sort_order)",
        )
        .eq("status", "active")
        .limit(perSource);
      if (data.q) q = q.ilike("title", `%${data.q}%`);
      if (cityIlike) q = q.ilike("city", cityIlike);
      if (data.price_min_cents != null) q = q.gte("price_cents", data.price_min_cents);
      if (data.price_max_cents != null) q = q.lte("price_cents", data.price_max_cents);
      if (mpCategoryId) q = q.eq("category_id", mpCategoryId);
      const { data: rows, error } = await q;
      if (error) throw new Error(error.message);
      for (const r of rows ?? []) out.push(marketplaceRowToListing(r as any));
    }

    // -------- vehicles (Private Sellers Only) --------
    if (wantVehicles) {
      let q = supabaseAdmin
        .from("vehicles")
        .select(
          "id,title,description,year,make,model,trim,price_cents,currency,mileage_km,city,province,postal_code,status,seller_id,seller_type,condition,transmission,fuel_type,drivetrain,body_type,exterior_color,vin,created_at,view_count,featured_until,dealer_business_id,vehicle_photos(storage_path,sort_order)",
        )
        .eq("status", "active")
        .eq("seller_type", "private") // product rule: private sellers only in the unified feed
        .limit(perSource);
      if (data.q) q = q.ilike("title", `%${data.q}%`);
      if (cityIlike) q = q.ilike("city", cityIlike);
      if (data.price_min_cents != null) q = q.gte("price_cents", data.price_min_cents);
      if (data.price_max_cents != null) q = q.lte("price_cents", data.price_max_cents);
      const { data: rows, error } = await q;
      if (error) throw new Error(error.message);
      for (const r of rows ?? []) out.push(vehicleRowToListing(r as any));
    }

    // -------- businesses → Services + Business Directory --------
    if (wantServices || wantDirectory) {
      let q = supabaseAdmin
        .from("businesses")
        .select(
          "id,name,slug,description,hero_image_url,city,province,postal_code,latitude,longitude,status,owner_id,created_at,category_id,featured_until,category:categories!businesses_category_id_fkey(slug,name)",
        )
        .eq("status", "approved")
        .limit(perSource);
      if (data.q) q = q.ilike("name", `%${data.q}%`);
      if (cityIlike) q = q.ilike("city", cityIlike);
      if (bizCategoryId) q = q.eq("category_id", bizCategoryId);
      const { data: rows, error } = await q;
      if (error) throw new Error(error.message);
      for (const r of rows ?? []) {
        const slug = (r as any).category?.slug ?? null;
        const isService = slug && (SERVICE_CATEGORY_SLUGS as readonly string[]).includes(slug);
        // When a section is explicitly chosen, respect the services/directory split.
        // When section === "all" (services OR directory true), every business shows once.
        if (data.section === "services") {
          if (isService) out.push(businessRowToListing(r as any, { kind: "service" }));
        } else if (data.section === "business-directory") {
          out.push(businessRowToListing(r as any, { kind: "business" }));
        } else {
          // "all": tag each business by whether it's a service or general directory entry.
          out.push(businessRowToListing(r as any, { kind: isService ? "service" : "business" }));
        }
      }
    }

    // -------- Geo filter (Near Me / radius) --------
    let withDistance: Array<BaseListing & { _distance?: number | null }> = out;
    if (data.lat != null && data.lng != null) {
      const origin = { lat: data.lat, lng: data.lng };
      withDistance = out.map((l) => ({
        ...l,
        _distance: haversineKm(origin, {
          lat: l.location.latitude ?? null,
          lng: l.location.longitude ?? null,
        }),
      }));
      if (data.radius_km != null) {
        const r = data.radius_km;
        withDistance = withDistance.filter(
          (l) => l._distance != null && l._distance <= r,
        );
      }
    }

    // -------- Sort --------
    const cmp = {
      newest: (a: BaseListing, b: BaseListing) =>
        a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0,
      oldest: (a: BaseListing, b: BaseListing) =>
        a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0,
      price_asc: (a: BaseListing, b: BaseListing) =>
        (a.price_cents ?? 0) - (b.price_cents ?? 0),
      price_desc: (a: BaseListing, b: BaseListing) =>
        (b.price_cents ?? 0) - (a.price_cents ?? 0),
      most_viewed: (a: BaseListing, b: BaseListing) =>
        (b.view_count ?? 0) - (a.view_count ?? 0),
      featured_first: (a: BaseListing, b: BaseListing) => {
        const fa = a.is_featured ? 1 : 0;
        const fb = b.is_featured ? 1 : 0;
        if (fa !== fb) return fb - fa;
        return a.created_at < b.created_at ? 1 : -1;
      },
      distance: (
        a: BaseListing & { _distance?: number | null },
        b: BaseListing & { _distance?: number | null },
      ) => {
        const da = a._distance ?? Number.POSITIVE_INFINITY;
        const db = b._distance ?? Number.POSITIVE_INFINITY;
        return da - db;
      },
    }[data.sort];

    withDistance.sort(cmp as any);
    // Strip the temporary _distance field before returning.
    const trimmed = withDistance.slice(0, data.limit).map(({ _distance, ...rest }) => rest);
    return { listings: trimmed as BaseListing[], total: withDistance.length };
  });

// -------------------- Verticals & sub-categories --------------------
// Top-level verticals shown in /listings. Future verticals (real_estate, jobs,
// events) are intentionally omitted from this list — they live as reserved
// routes (/real-estate, /jobs, /events) until their tables exist.
export const VERTICALS = [
  { key: "all", label: "All" },
  { key: "vehicles", label: "Vehicles" },
  { key: "business-directory", label: "Business Directory" },
  { key: "marketplace", label: "Marketplace" },
  { key: "services", label: "Services" },
] as const;
export type Vertical = (typeof VERTICALS)[number]["key"];

// Reserved-but-not-built future verticals. Surfaced in nav as
// "Coming soon" placeholders, not as feed sections.
export const FUTURE_VERTICALS = [
  { key: "real-estate", label: "Real Estate" },
  { key: "jobs", label: "Jobs" },
  { key: "events", label: "Events" },
] as const;

// Sub-category lookup per vertical. Returns [{slug, name}] sorted for menus.
export const listCategoriesForVertical = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ vertical: z.enum(["vehicles","business-directory","marketplace","services","all"]) }).parse(input ?? {}),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.vertical === "marketplace") {
      const { data: rows } = await supabaseAdmin
        .from("marketplace_categories")
        .select("slug,name,sort_order")
        .order("sort_order", { ascending: true });
      return (rows ?? []).map((r: any) => ({ slug: r.slug, name: r.name }));
    }
    if (data.vertical === "business-directory" || data.vertical === "services") {
      const { data: rows } = await supabaseAdmin
        .from("categories")
        .select("slug,name,sort_order")
        .order("sort_order", { ascending: true });
      const all = (rows ?? []).map((r: any) => ({ slug: r.slug, name: r.name }));
      // For "services" vertical, restrict to service-bearing categories.
      if (data.vertical === "services") {
        const allowed = new Set(SERVICE_CATEGORY_SLUGS as readonly string[]);
        return all.filter((c) => allowed.has(c.slug));
      }
      return all;
    }
    // vehicles / all — no sub-category list (vehicles has its own filters).
    return [];
  });
