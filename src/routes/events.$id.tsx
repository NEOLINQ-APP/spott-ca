import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { eventPhotoUrl, eventCategoryLabel, fmtEventPrice, fmtEventDateTime } from "@/lib/events";
import { ArrowLeft, Calendar, MapPin, Ticket, Heart, Users, Trash2, ExternalLink, Video } from "lucide-react";
import { toast } from "sonner";
import { ShareButton } from "@/components/ShareButton";

export const Route = createFileRoute("/events/$id")({
  component: EventDetail,
  loader: async ({ params }) => {
    const { data: event } = await supabase
      .from("events")
      .select("id,title,description,category,start_at,end_at,city,province,is_online,price_cents,currency,status")
      .eq("id", params.id)
      .maybeSingle();
    const { data: photo } = await supabase
      .from("event_photos")
      .select("storage_path")
      .eq("event_id", params.id)
      .order("sort_order")
      .limit(1)
      .maybeSingle();
    return { event, photoPath: photo?.storage_path ?? null };
  },
  head: ({ params, loaderData }) => {
    const e = loaderData?.event;
    if (!e || e.status !== "published") {
      return {
        meta: [{ title: "Event — Spott" }, { name: "robots", content: "noindex,follow" }],
      };
    }
    const where = e.is_online ? "Online" : [e.city, e.province].filter(Boolean).join(", ") || "Canada";
    const title = `${e.title} — ${where} — Spott Events`;
    const rawDesc = e.description?.trim();
    const description = rawDesc ? rawDesc.slice(0, 155) : `${e.title}, ${fmtEventDateTime(e.start_at)} in ${where}. See details and RSVP on Spott.`;
    const url = `https://www.spott.ca/events/${params.id}`;
    const image = loaderData?.photoPath ? eventPhotoUrl(loaderData.photoPath) : "";
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:type", content: "event" },
    ];
    if (image) {
      meta.push({ property: "og:image", content: image });
      meta.push({ name: "twitter:image", content: image });
      meta.push({ name: "twitter:card", content: "summary_large_image" });
    }

    const jsonLd: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "Event",
      name: e.title,
      url,
      startDate: e.start_at,
      ...(e.end_at ? { endDate: e.end_at } : {}),
      ...(rawDesc ? { description: rawDesc } : {}),
      ...(image ? { image } : {}),
      eventAttendanceMode: e.is_online
        ? "https://schema.org/OnlineEventAttendanceMode"
        : "https://schema.org/OfflineEventAttendanceMode",
      eventStatus: "https://schema.org/EventScheduled",
      location: e.is_online
        ? { "@type": "VirtualLocation", url }
        : { "@type": "Place", name: where, address: { "@type": "PostalAddress", addressLocality: e.city ?? undefined, addressRegion: e.province ?? undefined, addressCountry: "CA" } },
      offers: {
        "@type": "Offer",
        price: e.price_cents ? (e.price_cents / 100).toFixed(2) : "0",
        priceCurrency: e.currency || "CAD",
        url,
        availability: "https://schema.org/InStock",
      },
    };

    return {
      meta,
      links: [{ rel: "canonical", href: url }],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }],
    };
  },
});

type EventFull = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  start_at: string;
  end_at: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  is_online: boolean;
  ticket_url: string | null;
  price_cents: number | null;
  currency: string;
  capacity: number | null;
  status: string;
  view_count: number;
};

function EventDetail() {
  const { id } = useParams({ from: "/events/$id" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<EventFull | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorited, setFavorited] = useState(false);
  const [rsvpStatus, setRsvpStatus] = useState<"going" | "interested" | null>(null);
  const [goingCount, setGoingCount] = useState(0);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data: e } = await supabase
        .from("events")
        .select("id,user_id,title,description,category,start_at,end_at,address,city,province,is_online,ticket_url,price_cents,currency,capacity,status,view_count")
        .eq("id", id)
        .maybeSingle();
      if (cancel) return;
      setEvent(e as EventFull | null);
      if (e) {
        supabase.from("events").update({ view_count: (e.view_count || 0) + 1 }).eq("id", id);
      }
      const { data: ph } = await supabase.from("event_photos").select("storage_path").eq("event_id", id).order("sort_order");
      if (!cancel) setPhotos((ph ?? []).map((p: any) => p.storage_path));
      const { count } = await supabase.from("event_rsvps").select("id", { count: "exact", head: true }).eq("event_id", id).eq("status", "going");
      if (!cancel) setGoingCount(count ?? 0);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [id]);

  useEffect(() => {
    if (!user) return;
    supabase.from("event_favorites").select("id").eq("user_id", user.id).eq("event_id", id).maybeSingle().then(({ data }) => setFavorited(!!data));
    supabase.from("event_rsvps").select("status").eq("user_id", user.id).eq("event_id", id).maybeSingle().then(({ data }) => setRsvpStatus((data?.status as any) ?? null));
  }, [user, id]);

  const toggleFav = async () => {
    if (!user) return toast.error("Sign in to save events");
    if (favorited) {
      await supabase.from("event_favorites").delete().eq("user_id", user.id).eq("event_id", id);
      setFavorited(false);
    } else {
      await supabase.from("event_favorites").insert({ user_id: user.id, event_id: id });
      setFavorited(true);
    }
  };

  const setRsvp = async (status: "going" | "interested") => {
    if (!user) return toast.error("Sign in to RSVP");
    const prevStatus = rsvpStatus;
    if (rsvpStatus === status) {
      await supabase.from("event_rsvps").delete().eq("user_id", user.id).eq("event_id", id);
      setRsvpStatus(null);
      if (status === "going") setGoingCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from("event_rsvps").upsert({ user_id: user.id, event_id: id, status }, { onConflict: "user_id,event_id" });
      setRsvpStatus(status);
      if (status === "going" && prevStatus !== "going") setGoingCount((c) => c + 1);
      if (status !== "going" && prevStatus === "going") setGoingCount((c) => Math.max(0, c - 1));
    }
  };

  const removeEvent = async () => {
    if (!event || !confirm("Delete this event permanently?")) return;
    setDeleting(true);
    const { error } = await supabase.from("events").delete().eq("id", event.id);
    setDeleting(false);
    if (error) return toast.error(error.message);
    toast.success("Event deleted");
    navigate({ to: "/events" });
  };

  if (loading) return <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>;
  if (!event) return <div className="p-8 text-center text-sm text-muted-foreground">Event not found.</div>;

  const isOwner = user?.id === event.user_id;
  const where = event.is_online ? "Online event" : [event.address, event.city, event.province].filter(Boolean).join(", ") || "Location TBA";
  const isFull = event.capacity != null && goingCount >= event.capacity;

  return (
    <div className="mx-auto max-w-4xl px-4 py-6">
      <Link to="/events" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to events
      </Link>

      {event.status !== "published" && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          This event is {event.status} — only visible to you{isOwner ? "" : " and the organizer"}.
        </div>
      )}

      <div className="mt-4 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="aspect-[16/9] overflow-hidden rounded-2xl bg-muted">
            {photos[0] ? (
              <img src={eventPhotoUrl(photos[0])} alt={event.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground"><Calendar className="h-16 w-16" /></div>
            )}
          </div>
          {photos.length > 1 && (
            <div className="mt-2 grid grid-cols-5 gap-2">
              {photos.slice(1, 6).map((p) => (
                <div key={p} className="aspect-square overflow-hidden rounded-lg bg-muted">
                  <img src={eventPhotoUrl(p)} alt="" className="h-full w-full object-cover" />
                </div>
              ))}
            </div>
          )}

          {event.description && (
            <section className="mt-6 rounded-xl border border-border bg-card p-5">
              <h2 className="font-semibold">About this event</h2>
              <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{event.description}</p>
            </section>
          )}
        </div>

        <div>
          <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold uppercase tracking-wide">
            {eventCategoryLabel(event.category)}
          </span>
          <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight">{event.title}</h1>

          <div className="mt-4 space-y-3 rounded-xl border border-border bg-card p-4 text-sm">
            <div className="flex items-start gap-2">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <div>
                <div className="font-medium">{fmtEventDateTime(event.start_at)}</div>
                {event.end_at && <div className="text-xs text-muted-foreground">to {fmtEventDateTime(event.end_at)}</div>}
              </div>
            </div>
            <div className="flex items-start gap-2">
              {event.is_online ? <Video className="mt-0.5 h-4 w-4 shrink-0 text-primary" /> : <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />}
              <div>{where}</div>
            </div>
            <div className="flex items-center gap-2">
              <Ticket className="h-4 w-4 shrink-0 text-primary" />
              <span className="font-semibold">{fmtEventPrice(event.price_cents, event.currency)}</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4 shrink-0" />
              {goingCount} going{event.capacity ? ` · ${event.capacity} capacity` : ""}
              {isFull && <span className="font-medium text-destructive"> · Full</span>}
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {event.ticket_url && (
              <a href={event.ticket_url} target="_blank" rel="noopener noreferrer" className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground hover:bg-primary/90">
                <ExternalLink className="h-4 w-4" /> Get tickets
              </a>
            )}
            <button
              onClick={() => setRsvp("going")}
              disabled={isFull && rsvpStatus !== "going"}
              className={`inline-flex w-full items-center justify-center gap-1.5 rounded-md border px-4 py-2.5 text-sm font-medium disabled:opacity-50 ${rsvpStatus === "going" ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent/10"}`}
            >
              {rsvpStatus === "going" ? "You're going" : "I'm going"}
            </button>
            <button
              onClick={() => setRsvp("interested")}
              className={`inline-flex w-full items-center justify-center gap-1.5 rounded-md border px-4 py-2.5 text-sm font-medium ${rsvpStatus === "interested" ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent/10"}`}
            >
              {rsvpStatus === "interested" ? "Interested ✓" : "Interested"}
            </button>
            <div className="flex gap-2">
              <button onClick={toggleFav} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm hover:bg-accent/10">
                <Heart className={`h-4 w-4 ${favorited ? "fill-red-500 text-red-500" : ""}`} />
                {favorited ? "Saved" : "Save"}
              </button>
              <ShareButton url={`/events/${event.id}`} title={event.title} className="flex-1 justify-center" />
            </div>
            {isOwner && (
              <button onClick={removeEvent} disabled={deleting} className="inline-flex w-full items-center justify-center gap-1.5 rounded-md border border-destructive/40 px-4 py-2 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50">
                <Trash2 className="h-4 w-4" /> Delete event
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
