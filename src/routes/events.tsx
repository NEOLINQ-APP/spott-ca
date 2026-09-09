import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { eventPhotoUrl, EVENT_CATEGORIES, eventCategoryLabel, fmtEventPrice, fmtEventDate } from "@/lib/events";
import { Calendar, MapPin, LayoutGrid, Map as MapIcon, PlusCircle, Ticket } from "lucide-react";
import { MapView, type MapViewPin } from "@/components/MapView";
import { lookupCityCoords } from "@/lib/city-coords";
import { LocationCascadeFilter } from "@/components/LocationCascadeFilter";

export const Route = createFileRoute("/events")({
  component: EventsPage,
  head: () => ({
    meta: [
      { title: "Events — Spott" },
      { name: "description", content: "Concerts, markets, festivals, and community events across Canada." },
      { property: "og:title", content: "Events — Spott" },
      { property: "og:description", content: "Discover and post local events on Spott." },
    ],
    links: [{ rel: "canonical", href: "https://www.spott.ca/events" }],
  }),
});

type EventRow = {
  id: string;
  title: string;
  category: string;
  start_at: string;
  city: string | null;
  province: string | null;
  is_online: boolean;
  price_cents: number | null;
  currency: string;
  event_photos: Array<{ storage_path: string; sort_order: number }>;
};

function EventsPage() {
  const [rows, setRows] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [country, setCountry] = useState("");
  const [province, setProvince] = useState("");
  const [city, setCity] = useState("");
  const [view, setView] = useState<"grid" | "map">("grid");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      let query = supabase
        .from("events")
        .select("id,title,category,start_at,city,province,is_online,price_cents,currency,event_photos(storage_path,sort_order)")
        .eq("status", "published")
        .gte("start_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order("start_at", { ascending: true })
        .limit(60);
      if (category) query = query.eq("category", category);
      if (province) query = query.eq("province", province);
      if (city) query = query.ilike("city", city);
      if (q) query = query.ilike("title", `%${q.replace(/[%_]/g, "\\$&")}%`);
      const { data } = await query;
      if (!cancelled) {
        setRows((data ?? []) as EventRow[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [q, category, province, city]);

  const mapPins: MapViewPin[] = useMemo(() => {
    const out: MapViewPin[] = [];
    for (const e of rows) {
      const c = lookupCityCoords(e.city, e.province);
      if (!c) continue;
      out.push({
        id: e.id,
        title: e.title,
        subtitle: [fmtEventDate(e.start_at), [e.city, e.province].filter(Boolean).join(", ")].filter(Boolean).join(" · "),
        href: `/events/${e.id}`,
        lat: c[0],
        lng: c[1],
      });
    }
    return out;
  }, [rows]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Events</h1>
          <p className="text-sm text-muted-foreground">Concerts, markets, festivals, and community events near you.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/events/favorites" className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted">
            Saved events
          </Link>
          <div className="inline-flex overflow-hidden rounded-md border border-border">
            <button type="button" onClick={() => setView("grid")} className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium ${view === "grid" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}>
              <LayoutGrid className="h-3.5 w-3.5" /> Grid
            </button>
            <button type="button" onClick={() => setView("map")} className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium ${view === "map" ? "bg-primary text-primary-foreground" : "bg-card hover:bg-muted"}`}>
              <MapIcon className="h-3.5 w-3.5" /> Map
            </button>
          </div>
          <Link to="/events/new" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            <PlusCircle className="h-3.5 w-3.5" /> Post an event
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-3">
        <input className="rounded-md border border-border bg-background p-2 text-sm" placeholder="Search events…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="rounded-md border border-border bg-background p-2 text-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All categories</option>
          {EVENT_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
        <LocationCascadeFilter
          className="sm:col-span-3"
          country={country}
          province={province}
          city={city}
          onCountryChange={setCountry}
          onProvinceChange={setProvince}
          onCityChange={setCity}
        />
      </div>

      {loading ? (
        <div className="mt-10 text-center text-sm text-muted-foreground">Loading events…</div>
      ) : rows.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No upcoming events match your search. <Link to="/events/new" className="text-primary hover:underline">Be the first to post one</Link>.
        </div>
      ) : view === "map" ? (
        <div className="mt-6 space-y-2">
          <MapView pins={mapPins} />
          <p className="text-xs text-muted-foreground">Showing {mapPins.length} of {rows.length} events with a recognized city.</p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((e) => {
            const cover = e.event_photos.slice().sort((a, b) => a.sort_order - b.sort_order)[0];
            return (
              <Link key={e.id} to="/events/$id" params={{ id: e.id }} className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/40">
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  {cover ? (
                    <img src={eventPhotoUrl(cover.storage_path)} alt={e.title} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground"><Calendar className="h-10 w-10" /></div>
                  )}
                  <span className="absolute left-2 top-2 inline-flex items-center rounded-full bg-background/90 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide backdrop-blur">
                    {eventCategoryLabel(e.category)}
                  </span>
                </div>
                <div className="p-3">
                  <div className="line-clamp-1 text-sm font-semibold text-foreground">{e.title}</div>
                  <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" /> {fmtEventDate(e.start_at)}
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {e.is_online ? "Online" : [e.city, e.province].filter(Boolean).join(", ") || "TBA"}
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold">
                      <Ticket className="h-3 w-3" /> {fmtEventPrice(e.price_cents, e.currency)}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
