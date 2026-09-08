import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { eventPhotoUrl, fmtEventDate } from "@/lib/events";
import { Heart, Calendar } from "lucide-react";

export const Route = createFileRoute("/events/favorites")({
  component: EventFavoritesPage,
});

type EventRow = {
  id: string;
  title: string;
  start_at: string;
  city: string | null;
  province: string | null;
  is_online: boolean;
};

// Mirrors vehicles.favorites.tsx / marketplace.favorites.tsx's pattern
// exactly — its own parallel route, same reasoning as the vehicle one:
// each content type has its own detail route and card shape.
function EventFavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<EventRow[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data: favs } = await supabase
        .from("event_favorites")
        .select("event_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      const ids = (favs ?? []).map((f: any) => f.event_id);
      if (!ids.length) {
        setEvents([]);
        setLoading(false);
        return;
      }
      const { data: es } = await supabase
        .from("events")
        .select("id,title,start_at,city,province,is_online")
        .in("id", ids);
      if (cancel) return;
      setEvents((es ?? []) as EventRow[]);
      const { data: ph } = await supabase
        .from("event_photos")
        .select("event_id,storage_path,sort_order")
        .in("event_id", ids)
        .order("sort_order");
      const map: Record<string, string> = {};
      (ph ?? []).forEach((p: any) => {
        if (!map[p.event_id]) map[p.event_id] = p.storage_path;
      });
      setPhotos(map);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [user]);

  if (!authLoading && !user) {
    navigate({ to: "/auth" });
    return null;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Saved events</h1>

      {loading ? (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-xl bg-card" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center">
          <Heart className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">No saved events yet.</p>
          <Link to="/events" className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Browse events
          </Link>
        </div>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {events.map((e) => (
            <Link
              key={e.id}
              to="/events/$id"
              params={{ id: e.id }}
              className="group overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/40"
            >
              <div className="aspect-square overflow-hidden bg-muted">
                {photos[e.id] ? (
                  <img src={eventPhotoUrl(photos[e.id])} alt={e.title} className="h-full w-full object-cover transition group-hover:scale-105" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    <Calendar className="h-8 w-8" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <div className="line-clamp-1 text-sm font-semibold">{e.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{fmtEventDate(e.start_at)}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {e.is_online ? "Online" : e.city ? `${e.city}${e.province ? ", " + e.province : ""}` : "—"}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
