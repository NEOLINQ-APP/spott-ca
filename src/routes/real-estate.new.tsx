import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { getPhotoUploadUrl } from "@/lib/storage.functions";
import { PROPERTY_TYPES, LISTING_TYPES } from "@/lib/realEstate";
import { PROVINCES } from "@/lib/canada";
import { toast } from "sonner";
import { Upload, X, ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/real-estate/new")({
  component: NewPropertyPage,
});

function NewPropertyPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const getUploadUrl = useServerFn(getPhotoUploadUrl);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [propertyType, setPropertyType] = useState("residential");
  const [listingType, setListingType] = useState("sale");
  const [price, setPrice] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [squareFeet, setSquareFeet] = useState("");
  const [lotSize, setLotSize] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("ON");
  const [postal, setPostal] = useState("");
  const [approximateLocation, setApproximateLocation] = useState(false);
  const [virtualTourUrl, setVirtualTourUrl] = useState("");
  const [amenitiesInput, setAmenitiesInput] = useState("");
  const [agentName, setAgentName] = useState("");
  const [agentPhone, setAgentPhone] = useState("");
  const [agentEmail, setAgentEmail] = useState("");
  const [photos, setPhotos] = useState<{ file: File; previewUrl: string; uploading: boolean; key: string | null }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    return () => photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!authLoading && !user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">Sign in to list a property</h1>
        <p className="mt-2 text-sm text-muted-foreground">You need a free Spott account to list a property.</p>
        <Link to="/auth" search={{ next: "/real-estate/new" } as any} className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Sign in
        </Link>
      </div>
    );
  }

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files ?? []).slice(0, 12 - photos.length);
    if (!incoming.length) return;
    const newEntries = incoming.map((file) => ({ file, previewUrl: URL.createObjectURL(file), uploading: true, key: null as string | null }));
    setPhotos((prev) => [...prev, ...newEntries]);
    for (const entry of newEntries) {
      try {
        const { uploadUrl, key } = await getUploadUrl({
          data: { kind: "property", filename: entry.file.name, contentType: entry.file.type, sizeBytes: entry.file.size },
        });
        const putRes = await fetch(uploadUrl, { method: "PUT", body: entry.file, headers: { "Content-Type": entry.file.type } });
        if (!putRes.ok) throw new Error(`upload failed (${putRes.status})`);
        setPhotos((prev) => prev.map((p) => (p === entry ? { ...p, uploading: false, key } : p)));
      } catch (err) {
        console.error("photo upload failed", err);
        toast.error(`Could not upload ${entry.file.name}`);
        setPhotos((prev) => prev.filter((p) => p !== entry));
      }
    }
  };

  const removePhoto = (entry: (typeof photos)[number]) => {
    URL.revokeObjectURL(entry.previewUrl);
    setPhotos((prev) => prev.filter((p) => p !== entry));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!title.trim()) return toast.error("Give this listing a title");
    if (!price || Number(price) <= 0) return toast.error("Add a price");
    if (!city.trim()) return toast.error("Add a city");

    setSubmitting(true);
    try {
      const amenities = amenitiesInput.split(",").map((a) => a.trim()).filter(Boolean);
      const { data: property, error } = await supabase
        .from("properties")
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          property_type: propertyType,
          listing_type: listingType,
          price_cents: Math.round(Number(price) * 100),
          bedrooms: bedrooms ? Number(bedrooms) : null,
          bathrooms: bathrooms ? Number(bathrooms) : null,
          square_feet: squareFeet ? Number(squareFeet) : null,
          lot_size_sqft: lotSize ? Number(lotSize) : null,
          address: approximateLocation ? null : address.trim() || null,
          city: city.trim(),
          province: province || null,
          postal_code: approximateLocation ? null : postal.trim() || null,
          approximate_location: approximateLocation,
          virtual_tour_url: virtualTourUrl.trim() || null,
          amenities,
          agent_name: agentName.trim() || null,
          agent_phone: agentPhone.trim() || null,
          agent_email: agentEmail.trim() || null,
        } as any)
        .select("id")
        .single();
      if (error) throw error;

      const readyPhotos = photos.filter((p) => p.key);
      for (let i = 0; i < readyPhotos.length; i++) {
        const { error: photoErr } = await supabase.from("property_photos").insert({
          property_id: property.id,
          storage_path: readyPhotos[i].key as string,
          sort_order: i,
        });
        if (photoErr) console.error("photo link failed", photoErr);
      }
      toast.success("Property listed!");
      navigate({ to: "/real-estate/$id", params: { id: property.id } });
    } catch (err: any) {
      toast.error(err.message ?? "Could not list property");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link to="/real-estate" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to real estate
      </Link>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">List a property</h1>
      <p className="mt-1 text-sm text-muted-foreground">Free to list. Reach buyers and renters across Canada.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <div>
          <label className="text-sm font-medium">Listing title</label>
          <input className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Bright 2-bed condo downtown" required />
        </div>

        <div>
          <label className="text-sm font-medium">Description</label>
          <textarea className="mt-1 w-full resize-y rounded-md border border-border bg-background p-2.5 text-sm" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-sm font-medium">Property type</label>
            <select className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" value={propertyType} onChange={(e) => setPropertyType(e.target.value)}>
              {PROPERTY_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Sale or rent</label>
            <select className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" value={listingType} onChange={(e) => setListingType(e.target.value)}>
              {LISTING_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Price {listingType === "rent" ? "(per month)" : ""}</label>
            <input type="number" className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" value={price} onChange={(e) => setPrice(e.target.value)} required />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <div>
            <label className="text-sm font-medium">Bedrooms</label>
            <input type="number" step="0.5" className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Bathrooms</label>
            <input type="number" step="0.5" className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" value={bathrooms} onChange={(e) => setBathrooms(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Square feet</label>
            <input type="number" className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" value={squareFeet} onChange={(e) => setSquareFeet(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Lot size (sqft)</label>
            <input type="number" className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" value={lotSize} onChange={(e) => setLotSize(e.target.value)} />
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={approximateLocation} onChange={(e) => setApproximateLocation(e.target.checked)} />
          Show approximate location only (hides exact street address for privacy)
        </label>

        <div className="grid gap-4 sm:grid-cols-3">
          {!approximateLocation && (
            <div className="sm:col-span-3">
              <label className="text-sm font-medium">Street address</label>
              <input className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
          )}
          <div>
            <label className="text-sm font-medium">City</label>
            <input className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" value={city} onChange={(e) => setCity(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium">Province</label>
            <select className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" value={province} onChange={(e) => setProvince(e.target.value)}>
              {PROVINCES.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
            </select>
          </div>
          {!approximateLocation && (
            <div>
              <label className="text-sm font-medium">Postal code</label>
              <input className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" value={postal} onChange={(e) => setPostal(e.target.value.toUpperCase())} maxLength={7} />
            </div>
          )}
        </div>

        <div>
          <label className="text-sm font-medium">Virtual tour link (optional)</label>
          <input className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" value={virtualTourUrl} onChange={(e) => setVirtualTourUrl(e.target.value)} placeholder="https://…" />
        </div>

        <div>
          <label className="text-sm font-medium">Amenities (comma-separated)</label>
          <input className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" value={amenitiesInput} onChange={(e) => setAmenitiesInput(e.target.value)} placeholder="Parking, In-suite laundry, Balcony" />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-sm font-medium">Agent / contact name</label>
            <input className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" value={agentName} onChange={(e) => setAgentName(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Phone</label>
            <input className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" value={agentPhone} onChange={(e) => setAgentPhone(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium">Email</label>
            <input type="email" className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" value={agentEmail} onChange={(e) => setAgentEmail(e.target.value)} />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Photos</label>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {photos.map((p) => (
              <div key={p.previewUrl} className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
                <img src={p.previewUrl} alt="" className="h-full w-full object-cover" />
                {p.uploading && <div className="absolute inset-0 flex items-center justify-center bg-black/40"><Loader2 className="h-5 w-5 animate-spin text-white" /></div>}
                <button type="button" onClick={() => removePhoto(p)} className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white hover:bg-black/80">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {photos.length < 12 && (
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary">
                <Upload className="h-5 w-5" />
                <span className="text-xs">Add photo</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={onPick} />
              </label>
            )}
          </div>
        </div>

        <button type="submit" disabled={submitting} className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null} List property
        </button>
      </form>
    </div>
  );
}
