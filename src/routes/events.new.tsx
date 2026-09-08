import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { getPhotoUploadUrl } from "@/lib/storage.functions";
import { EVENT_CATEGORIES } from "@/lib/events";
import { toast } from "sonner";
import { Upload, X, ArrowLeft, Loader2 } from "lucide-react";
import { PROVINCES } from "@/lib/canada";

export const Route = createFileRoute("/events/new")({
  component: NewEventPage,
});

function NewEventPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const getUploadUrl = useServerFn(getPhotoUploadUrl);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("community");
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [isOnline, setIsOnline] = useState(false);
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("ON");
  const [postal, setPostal] = useState("");
  const [ticketUrl, setTicketUrl] = useState("");
  const [isFree, setIsFree] = useState(true);
  const [price, setPrice] = useState("");
  const [capacity, setCapacity] = useState("");
  const [photos, setPhotos] = useState<{ file: File; previewUrl: string; uploading: boolean; key: string | null }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    return () => photos.forEach((p) => URL.revokeObjectURL(p.previewUrl));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!authLoading && !user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">Sign in to post an event</h1>
        <p className="mt-2 text-sm text-muted-foreground">You need a free Spott account to post an event.</p>
        <Link
          to="/auth"
          search={{ next: "/events/new" } as any}
          className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files ?? []).slice(0, 8 - photos.length);
    if (!incoming.length) return;
    const newEntries = incoming.map((file) => ({ file, previewUrl: URL.createObjectURL(file), uploading: true, key: null as string | null }));
    setPhotos((prev) => [...prev, ...newEntries]);
    for (const entry of newEntries) {
      try {
        const { uploadUrl, key } = await getUploadUrl({
          data: { kind: "event", filename: entry.file.name, contentType: entry.file.type, sizeBytes: entry.file.size },
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
    if (!title.trim()) return toast.error("Give your event a title");
    if (!startDate || !startTime) return toast.error("Pick a start date and time");
    if (!isOnline && !city.trim()) return toast.error("Add a city, or mark this as an online event");

    setSubmitting(true);
    try {
      const startAt = new Date(`${startDate}T${startTime}`).toISOString();
      const endAt = endDate && endTime ? new Date(`${endDate}T${endTime}`).toISOString() : null;
      const priceCents = isFree ? null : Math.round((Number(price) || 0) * 100);

      const { data: event, error } = await supabase
        .from("events")
        .insert({
          user_id: user.id,
          title: title.trim(),
          description: description.trim() || null,
          category,
          start_at: startAt,
          end_at: endAt,
          is_online: isOnline,
          address: isOnline ? null : address.trim() || null,
          city: isOnline ? null : city.trim() || null,
          province: isOnline ? null : province || null,
          postal_code: isOnline ? null : postal.trim() || null,
          ticket_url: ticketUrl.trim() || null,
          price_cents: priceCents,
          currency: "CAD",
          capacity: capacity ? Number(capacity) : null,
        } as any)
        .select("id")
        .single();
      if (error) throw error;

      const readyPhotos = photos.filter((p) => p.key);
      for (let i = 0; i < readyPhotos.length; i++) {
        const { error: photoErr } = await supabase.from("event_photos").insert({
          event_id: event.id,
          storage_path: readyPhotos[i].key as string,
          sort_order: i,
        });
        if (photoErr) console.error("photo link failed", photoErr);
      }
      toast.success("Event posted!");
      navigate({ to: "/events/$id", params: { id: event.id } });
    } catch (err: any) {
      toast.error(err.message ?? "Could not post event");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link to="/events" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to events
      </Link>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">Post an event</h1>
      <p className="mt-1 text-sm text-muted-foreground">Free to post. Reach people across Canada.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <div>
          <label className="text-sm font-medium">Event title</label>
          <input className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Edmonton Night Market" required />
        </div>

        <div>
          <label className="text-sm font-medium">Description</label>
          <textarea className="mt-1 w-full resize-y rounded-md border border-border bg-background p-2.5 text-sm" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's happening? Who's it for?" />
        </div>

        <div>
          <label className="text-sm font-medium">Category</label>
          <select className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
            {EVENT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Starts</label>
            <div className="mt-1 flex gap-2">
              <input type="date" className="w-full rounded-md border border-border bg-background p-2.5 text-sm" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              <input type="time" className="w-full rounded-md border border-border bg-background p-2.5 text-sm" value={startTime} onChange={(e) => setStartTime(e.target.value)} required />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium">Ends (optional)</label>
            <div className="mt-1 flex gap-2">
              <input type="date" className="w-full rounded-md border border-border bg-background p-2.5 text-sm" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              <input type="time" className="w-full rounded-md border border-border bg-background p-2.5 text-sm" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
            </div>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={isOnline} onChange={(e) => setIsOnline(e.target.checked)} />
          This is an online event (no physical location)
        </label>

        {!isOnline && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="text-sm font-medium">Address</label>
              <input className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Street address (optional)" />
            </div>
            <div>
              <label className="text-sm font-medium">City</label>
              <input className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" value={city} onChange={(e) => setCity(e.target.value)} required={!isOnline} />
            </div>
            <div>
              <label className="text-sm font-medium">Province</label>
              <select className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" value={province} onChange={(e) => setProvince(e.target.value)}>
                {PROVINCES.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Postal code</label>
              <input className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" value={postal} onChange={(e) => setPostal(e.target.value.toUpperCase())} maxLength={7} />
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Ticket / registration link</label>
            <input className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" value={ticketUrl} onChange={(e) => setTicketUrl(e.target.value)} placeholder="https://…" />
          </div>
          <div>
            <label className="text-sm font-medium">Capacity (optional)</label>
            <input type="number" className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" value={capacity} onChange={(e) => setCapacity(e.target.value)} placeholder="Leave blank for unlimited" />
          </div>
        </div>

        <div>
          <label className="flex items-center gap-2 text-sm font-medium">
            <input type="checkbox" checked={isFree} onChange={(e) => setIsFree(e.target.checked)} />
            This event is free
          </label>
          {!isFree && (
            <input type="number" step="0.01" className="mt-2 w-full max-w-xs rounded-md border border-border bg-background p-2.5 text-sm" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="Price (CAD)" />
          )}
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
            {photos.length < 8 && (
              <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary">
                <Upload className="h-5 w-5" />
                <span className="text-xs">Add photo</span>
                <input type="file" accept="image/*" multiple className="hidden" onChange={onPick} />
              </label>
            )}
          </div>
        </div>

        <button type="submit" disabled={submitting} className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Post event
        </button>
      </form>
    </div>
  );
}
