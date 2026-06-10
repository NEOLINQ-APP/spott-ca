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
    const perSource = Math.min(500, (data.limit + data.offset) * 2);

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

    // Business-only views must page against the full directory, not a sampled
    // cross-source result set. This keeps all installed businesses discoverable.
    if (data.section === "business-directory" || data.section === "services") {
      if (data.category && !bizCategoryId) return { listings: [], total: 0 };

      let serviceCategoryIds: string[] = [];
      if (data.section === "services" && !bizCategoryId) {
        const { data: serviceCats } = await supabaseAdmin
          .from("categories")
          .select("id")
          .in("slug", [...SERVICE_CATEGORY_SLUGS]);
        serviceCategoryIds = (serviceCats ?? []).map((c: any) => c.id);
        if (serviceCategoryIds.length === 0) return { listings: [], total: 0 };
      }

      let q = supabaseAdmin
        .from("businesses")
        .select(
          "id,name,slug,description,hero_image_url,city,province,postal_code,latitude,longitude,status,owner_id,created_at,category_id,featured_until,featured_priority,is_claimed,category:categories!businesses_category_id_fkey(slug,name)",
          { count: "exact" },
        )
        .eq("status", "approved");
      if (data.q) {
        const term = data.q.replace(/[,(){}]/g, " ").trim();
        q = q.or(`name.ilike.%${term}%,keywords.cs.{${term.toLowerCase()}}`);
      }
      if (cityIlike) q = q.ilike("city", cityIlike);
      if (bizCategoryId) q = q.eq("category_id", bizCategoryId);
      if (serviceCategoryIds.length) q = q.in("category_id", serviceCategoryIds);

      if (data.sort === "oldest") {
        q = q.order("created_at", { ascending: true });
      } else if (data.sort === "featured_first") {
        q = q
          .order("featured_priority", { ascending: false, nullsFirst: false })
          .order("featured_until", { ascending: false, nullsFirst: false })
          .order("created_at", { ascending: false });
      } else {
        q = q.order("created_at", { ascending: false });
      }

      if (data.lat == null || data.lng == null) {
        q = q.range(data.offset, data.offset + data.limit - 1);
      } else {
        q = q.limit(10000);
      }

      const { data: rows, error, count } = await q;
      if (error) throw new Error(error.message);

      let businessRows = (rows ?? []).map((r: any) =>
        businessRowToListing(r, { kind: data.section === "services" ? "service" : "business" }),
      ) as Array<BaseListing & { _distance?: number | null }>;

      if (data.lat != null && data.lng != null) {
        const origin = { lat: data.lat, lng: data.lng };
        businessRows = businessRows.map((l) => ({
          ...l,
          _distance: haversineKm(origin, {
            lat: l.location.latitude ?? null,
            lng: l.location.longitude ?? null,
          }),
        }));
        if (data.radius_km != null) {
          businessRows = businessRows.filter((l) => l._distance != null && l._distance <= data.radius_km!);
        }
        businessRows.sort((a, b) => (a._distance ?? Number.POSITIVE_INFINITY) - (b._distance ?? Number.POSITIVE_INFINITY));
        const total = businessRows.length;
        const paged = businessRows.slice(data.offset, data.offset + data.limit);
        return { listings: paged.map(({ _distance, ...rest }) => rest), total };
      }

      return { listings: businessRows, total: count ?? businessRows.length };
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
          "id,name,slug,description,hero_image_url,city,province,postal_code,latitude,longitude,status,owner_id,created_at,category_id,featured_until,featured_priority,is_claimed,category:categories!businesses_category_id_fkey(slug,name)",
        )
        .eq("status", "approved")
        .limit(perSource);
      if (data.q) {
        // Match by business name OR by hashtag/keyword (e.g. "burger", "coffee").
        const term = data.q.replace(/[,()]/g, " ").trim();
        q = q.or(`name.ilike.%${term}%,keywords.cs.{${term.toLowerCase()}}`);
      }
      if (cityIlike) q = q.ilike("city", cityIlike);
      if (bizCategoryId) q = q.eq("category_id", bizCategoryId);
      const { data: rows, error } = await q;
      if (error) throw new Error(error.message);
      for (const r of rows ?? []) {
        const slug = (r as any).category?.slug ?? null;
        const isService = slug && (SERVICE_CATEGORY_SLUGS as readonly string[]).includes(slug);
        // Explicit business-directory/services sections return above with full
        // pagination; this fallback is the mixed "all" feed only.
        out.push(businessRowToListing(r as any, { kind: isService ? "service" : "business" }));
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
    // Boost score lifts featured + verified listings to the top across every
    // sort mode (Featured System ranking boost). Higher = better.
    const boost = (l: BaseListing) =>
      (l.is_featured ? 1000 : 0) + (l.featured_priority ?? 0) + (l.is_verified ? 50 : 0);

    const tieBreak: Record<string, (a: BaseListing, b: BaseListing) => number> = {
      newest: (a, b) => (a.created_at < b.created_at ? 1 : a.created_at > b.created_at ? -1 : 0),
      oldest: (a, b) => (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0),
      price_asc: (a, b) => (a.price_cents ?? 0) - (b.price_cents ?? 0),
      price_desc: (a, b) => (b.price_cents ?? 0) - (a.price_cents ?? 0),
      most_viewed: (a, b) => (b.view_count ?? 0) - (a.view_count ?? 0),
      featured_first: (a, b) => (a.created_at < b.created_at ? 1 : -1),
      distance: (a: any, b: any) =>
        (a._distance ?? Number.POSITIVE_INFINITY) - (b._distance ?? Number.POSITIVE_INFINITY),
    };

    // Distance sort is geo-primary (user explicitly chose proximity), so do NOT
    // apply the featured boost there — featured-first sort obviously honors it.
    const useBoost = data.sort !== "distance";
    const tb = tieBreak[data.sort] ?? tieBreak.newest;
    const cmp = useBoost
      ? (a: BaseListing, b: BaseListing) => {
          const db = boost(b) - boost(a);
          return db !== 0 ? db : tb(a, b);
        }
      : tb;

    withDistance.sort(cmp as any);
    // Strip the temporary _distance field before returning.
    const total = withDistance.length;
    const paged = withDistance.slice(data.offset, data.offset + data.limit);
    const trimmed = paged.map(({ _distance, ...rest }) => rest);
    return { listings: trimmed as BaseListing[], total };
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
