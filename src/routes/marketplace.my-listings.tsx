import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { photoUrl, formatPrice } from "@/lib/marketplace";
import { Plus, Trash2, EyeOff, Eye } from "lucide-react";
import { toast } from "sonner";
import { RateTransactionDialog } from "@/components/RateTransactionDialog";

export const Route = createFileRoute("/marketplace/my-listings")({
  component: MyListingsPage,
});

type Row = {
  id: string;
  title: string;
  price_cents: number;
  currency: string;
  listing_type: string;
  status: string;
  view_count: number;
  created_at: string;
};

function MyListingsPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState<{ id: string; title: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("marketplace_listings")
        .select("id,title,price_cents,currency,listing_type,status,view_count,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (cancel) return;
      const list = (data ?? []) as Row[];
      setRows(list);
      if (list.length) {
        const { data: ph } = await supabase
          .from("marketplace_listing_photos")
          .select("listing_id,storage_path,sort_order")
          .in("listing_id", list.map((r) => r.id))
          .order("sort_order");
        const map: Record<string, string> = {};
        (ph ?? []).forEach((p: any) => {
          if (!map[p.listing_id]) map[p.listing_id] = p.storage_path;
        });
        setPhotos(map);
      }
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

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("marketplace_listings").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, status } : r)));
    toast.success("Updated");
  };

  const del = async (id: string) => {
    if (!confirm("Delete this listing permanently?")) return;
    const { error } = await supabase.from("marketplace_listings").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((rs) => rs.filter((r) => r.id !== id));
    toast.success("Deleted");
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-semibold tracking-tight">My listings</h1>
        <Link
          to="/marketplace/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" /> New listing
        </Link>
      </div>

      {loading ? (
        <div className="mt-8 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-card" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">You haven't posted anything yet.</p>
          <Link
            to="/marketplace/new"
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" /> Post your first listing
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center gap-4 rounded-xl border border-border bg-card p-3">
              <Link to="/marketplace/$id" params={{ id: r.id }} className="block h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted">
                {photos[r.id] ? (
                  <img src={photoUrl(photos[r.id])} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full bg-muted" />
                )}
              </Link>
              <div className="min-w-0 flex-1">
                <Link to="/marketplace/$id" params={{ id: r.id }} className="block truncate font-medium hover:underline">
                  {r.title}
                </Link>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">
                    {formatPrice(r.price_cents, r.currency, r.listing_type)}
                  </span>
                  <span>·</span>
                  <span className={`rounded-full px-2 py-0.5 ${statusBadge(r.status)}`}>{r.status}</span>
                  <span>·</span>
                  <span>{r.view_count} views</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {(r.status === "active" || r.status === "pending" || r.status === "sold") && (
                  <select
                    value={r.status}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "sold") setRating({ id: r.id, title: r.title });
                      else setStatus(r.id, v);
                    }}
                    className="rounded-md border border-border bg-background px-2 py-1.5 text-xs"
                    title="Listing status"
                  >
                    <option value="active">Available</option>
                    <option value="pending">Pending</option>
                    <option value="sold">Sold</option>
                  </select>
                )}
                {r.status === "active" ? (
                  <button onClick={() => setStatus(r.id, "hidden")} className="rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-accent/10" title="Hide">
                    <EyeOff className="h-3.5 w-3.5" />
                  </button>
                ) : r.status === "hidden" ? (
                  <button onClick={() => setStatus(r.id, "active")} className="rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-accent/10" title="Unhide">
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                ) : null}
                <button
                  onClick={() => del(r.id)}
                  className="rounded-md border border-destructive/50 px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {rating && (
        <RateTransactionDialog
          listingId={rating.id}
          listingTitle={rating.title}
          onClose={() => setRating(null)}
          onDone={() => {
            setRows((rs) => rs.map((r) => (r.id === rating.id ? { ...r, status: "sold" } : r)));
            setRating(null);
          }}
        />
      )}
    </div>
  );
}

function statusBadge(status: string) {
  switch (status) {
    case "active":
      return "bg-emerald-500/15 text-emerald-600";
    case "sold":
      return "bg-amber-500/15 text-amber-600";
    case "hidden":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-muted-foreground";
  }
}
