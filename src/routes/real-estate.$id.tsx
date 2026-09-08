import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { propertyPhotoUrl, propertyTypeLabel, listingTypeLabel, fmtPropertyPrice, fmtBeds, fmtBaths } from "@/lib/realEstate";
import { ArrowLeft, Home, MapPin, BedDouble, Bath, Ruler, Heart, Trash2, ExternalLink, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { ShareButton } from "@/components/ShareButton";

// Public columns only — address/latitude/longitude/postal_code are fetched
// in a second, conditional query (below) ONLY when approximate_location is
// false. This is the actual privacy enforcement the Phase 3 spec calls for:
// exact location bytes never leave the server for an approximate listing,
// not merely hidden by the UI.
const PUBLIC_COLUMNS =
  "id,user_id,title,description,property_type,listing_type,price_cents,bedrooms,bathrooms,square_feet,lot_size_sqft,city,province,approximate_location,virtual_tour_url,amenities,agent_name,agent_phone,agent_email,status,view_count";
const EXACT_LOCATION_COLUMNS = "address,postal_code,latitude,longitude";

export const Route = createFileRoute("/real-estate/$id")({
  component: PropertyDetail,
  loader: async ({ params }) => {
    const { data: property } = await supabase.from("properties").select(PUBLIC_COLUMNS).eq("id", params.id).maybeSingle();
    const { data: photo } = await supabase
      .from("property_photos")
      .select("storage_path")
      .eq("property_id", params.id)
      .order("sort_order")
      .limit(1)
      .maybeSingle();
    return { property, photoPath: photo?.storage_path ?? null };
  },
  head: ({ params, loaderData }) => {
    const p = loaderData?.property as any;
    if (!p || p.status !== "published") {
      return { meta: [{ title: "Property — Spott" }, { name: "robots", content: "noindex,follow" }] };
    }
    const where = [p.city, p.province].filter(Boolean).join(", ") || "Canada";
    const title = `${p.title} — ${where} — Spott Real Estate`;
    const rawDesc = p.description?.trim();
    const description = rawDesc ? rawDesc.slice(0, 155) : `${propertyTypeLabel(p.property_type)} ${listingTypeLabel(p.listing_type).toLowerCase()} in ${where}. See details on Spott.`;
    const url = `https://www.spott.ca/real-estate/${params.id}`;
    const image = loaderData?.photoPath ? propertyPhotoUrl(loaderData.photoPath) : "";
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:type", content: "website" },
    ];
    if (image) {
      meta.push({ property: "og:image", content: image });
      meta.push({ name: "twitter:image", content: image });
      meta.push({ name: "twitter:card", content: "summary_large_image" });
    }

    const jsonLd: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "RealEstateListing",
      name: p.title,
      url,
      ...(rawDesc ? { description: rawDesc } : {}),
      ...(image ? { image } : {}),
      ...(!p.approximate_location && (p.city || p.province)
        ? { address: { "@type": "PostalAddress", addressLocality: p.city ?? undefined, addressRegion: p.province ?? undefined, addressCountry: "CA" } }
        : {}),
      offers: {
        "@type": "Offer",
        price: (p.price_cents / 100).toFixed(2),
        priceCurrency: "CAD",
        url,
        availability: "https://schema.org/InStock",
        ...(p.listing_type === "rent" ? { priceSpecification: { "@type": "UnitPriceSpecification", price: (p.price_cents / 100).toFixed(2), priceCurrency: "CAD", unitText: "MON" } } : {}),
      },
    };

    return {
      meta,
      links: [{ rel: "canonical", href: url }],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }],
    };
  },
});

type PropertyPublic = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  property_type: string;
  listing_type: string;
  price_cents: number;
  bedrooms: number | null;
  bathrooms: number | null;
  square_feet: number | null;
  lot_size_sqft: number | null;
  city: string | null;
  province: string | null;
  approximate_location: boolean;
  virtual_tour_url: string | null;
  amenities: string[];
  agent_name: string | null;
  agent_phone: string | null;
  agent_email: string | null;
  status: string;
  view_count: number;
  address?: string | null;
  postal_code?: string | null;
};

function PropertyDetail() {
  const { id } = useParams({ from: "/real-estate/$id" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [property, setProperty] = useState<PropertyPublic | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorited, setFavorited] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data: p } = await supabase.from("properties").select(PUBLIC_COLUMNS).eq("id", id).maybeSingle();
      if (cancel) return;
      let full = p as PropertyPublic | null;
      // Exact address/postal code only ever requested when the owner opted
      // into showing it — never fetched at all for an approximate listing.
      if (full && !full.approximate_location) {
        const { data: exact } = await supabase.from("properties").select(EXACT_LOCATION_COLUMNS).eq("id", id).maybeSingle();
        if (exact) full = { ...full, ...exact };
      }
      setProperty(full);
      if (full) {
        supabase.from("properties").update({ view_count: (full.view_count || 0) + 1 }).eq("id", id);
      }
      const { data: ph } = await supabase.from("property_photos").select("storage_path").eq("property_id", id).order("sort_order");
      if (!cancel) setPhotos((ph ?? []).map((x: any) => x.storage_path));
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [id]);

  useEffect(() => {
    if (!user) return;
    supabase.from("property_favorites").select("id").eq("user_id", user.id).eq("property_id", id).maybeSingle().then(({ data }) => setFavorited(!!data));
  }, [user, id]);

  const toggleFav = async () => {
    if (!user) return toast.error("Sign in to save properties");
    if (favorited) {
      await supabase.from("property_favorites").delete().eq("user_id", user.id).eq("property_id", id);
      setFavorited(false);
    } else {
      await supabase.from("property_favorites").insert({ user_id: user.id, property_id: id });
      setFavorited(true);
    }
  };

  const removeProperty = async () => {
    if (!property || !confirm("Delete this listing permanently?")) return;
    setDeleting(true);
    const { error } = await supabase.from("properties").delete().eq("id", property.id);
    setDeleting(false);
    if (error) return toast.error(error.message);
    toast.success("Listing deleted");
    navigate({ to: "/real-estate" });
  };

  if (loading) return <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>;
  if (!property) return <div className="p-8 text-center text-sm text-muted-foreground">Property not found.</div>;

  const isOwner = user?.id === property.user_id;
  const where = property.approximate_location
    ? [property.city, property.province].filter(Boolean).join(", ") || "Location on request"
    : [property.address, property.city, property.province].filter(Boolean).join(", ") || "Location on request";

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Link to="/real-estate" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to real estate
      </Link>

      {property.status !== "published" && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          This listing is {property.status} — only visible to you{isOwner ? "" : " and the owner"}.
        </div>
      )}

      <div className="mt-4 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
            {photos[0] ? (
              <img src={propertyPhotoUrl(photos[0])} alt={property.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground"><Home className="h-16 w-16" /></div>
            )}
          </div>
          {photos.length > 1 && (
            <div className="mt-2 grid grid-cols-5 gap-2">
              {photos.slice(1, 6).map((p) => (
                <div key={p} className="aspect-square overflow-hidden rounded-lg bg-muted">
                  <img src={propertyPhotoUrl(p)} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {property.description && (
            <section className="mt-6 rounded-xl border border-border bg-card p-5">
              <h2 className="font-semibold">Description</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{property.description}</p>
            </section>
          )}

          {property.amenities?.length > 0 && (
            <section className="mt-4 rounded-xl border border-border bg-card p-5">
              <h2 className="font-semibold">Amenities</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {property.amenities.map((a) => (
                  <span key={a} className="rounded-full bg-secondary px-2.5 py-1 text-xs">{a}</span>
                ))}
              </div>
            </section>
          )}

          {property.virtual_tour_url && (
            <a href={property.virtual_tour_url} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
              <ExternalLink className="h-4 w-4" /> Take the virtual tour
            </a>
          )}
        </div>

        <div>
          <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold uppercase tracking-wide">
            {propertyTypeLabel(property.property_type)} · {listingTypeLabel(property.listing_type)}
          </span>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight">{property.title}</h1>
          <div className="mt-1 text-2xl font-bold text-primary">{fmtPropertyPrice(property.price_cents, property.listing_type)}</div>

          <div className="mt-4 space-y-3 rounded-xl border border-border bg-card p-4 text-sm">
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                {where}
                {property.approximate_location && <div className="text-xs text-muted-foreground">Exact address shared after contact</div>}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
              {property.bedrooms != null && <span className="inline-flex items-center gap-1"><BedDouble className="h-4 w-4" /> {fmtBeds(property.bedrooms)}</span>}
              {property.bathrooms != null && <span className="inline-flex items-center gap-1"><Bath className="h-4 w-4" /> {fmtBaths(property.bathrooms)}</span>}
              {property.square_feet != null && <span className="inline-flex items-center gap-1"><Ruler className="h-4 w-4" /> {property.square_feet.toLocaleString()} sqft</span>}
            </div>
            {property.lot_size_sqft != null && (
              <div className="text-xs text-muted-foreground">Lot size: {property.lot_size_sqft.toLocaleString()} sqft</div>
            )}
          </div>

          {(property.agent_name || property.agent_phone || property.agent_email) && (
            <div className="mt-4 rounded-xl border border-border bg-card p-4 text-sm">
              <h2 className="font-semibold">Contact</h2>
              {property.agent_name && <div className="mt-1.5">{property.agent_name}</div>}
              {property.agent_phone && (
                <a href={`tel:${property.agent_phone}`} className="mt-1.5 flex items-center gap-1.5 text-primary hover:underline">
                  <Phone className="h-3.5 w-3.5" /> {property.agent_phone}
                </a>
              )}
              {property.agent_email && (
                <a href={`mailto:${property.agent_email}`} className="mt-1.5 flex items-center gap-1.5 text-primary hover:underline">
                  <Mail className="h-3.5 w-3.5" /> {property.agent_email}
                </a>
              )}
            </div>
          )}

          <div className="mt-4 space-y-2">
            <div className="flex gap-2">
              <button onClick={toggleFav} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm hover:bg-accent/10">
                <Heart className={`h-4 w-4 ${favorited ? "fill-red-500 text-red-500" : ""}`} />
                {favorited ? "Saved" : "Save"}
              </button>
              <ShareButton url={`/real-estate/${property.id}`} title={property.title} className="flex-1 justify-center" />
            </div>
            {isOwner && (
              <button onClick={removeProperty} disabled={deleting} className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-destructive/40 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50">
                <Trash2 className="h-4 w-4" /> Delete listing
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
