import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Bookmark, Trash2, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Saved = {
  id: string;
  label: string;
  query: string | null;
  city: string | null;
  category_slug: string | null;
};

export function SavedSearchesPanel() {
  const { user } = useAuth();
  const [items, setItems] = useState<Saved[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("saved_searches")
      .select("id,label,query,city,category_slug")
      .order("created_at", { ascending: false });
    setItems((data ?? []) as any);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user]);

  const remove = async (id: string) => {
    const prev = items;
    setItems(items.filter((i) => i.id !== id));
    const { error } = await supabase.from("saved_searches").delete().eq("id", id);
    if (error) { setItems(prev); toast.error("Could not delete"); }
  };

  if (!user) return null;
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">
        <Bookmark className="h-4 w-4" /> Saved searches
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-md border border-dashed border-border bg-background/40 p-4 text-center text-xs text-muted-foreground">
          No saved searches yet. From the Browse page, tap “Save this search”.
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/50 p-2.5">
              <Link
                to="/browse"
                search={{ q: s.query ?? undefined, city: s.city ?? undefined, category: s.category_slug ?? undefined } as any}
                className="min-w-0 flex-1"
              >
                <div className="truncate text-sm font-medium">{s.label}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {[s.query, s.city, s.category_slug].filter(Boolean).join(" · ") || "All listings"}
                </div>
              </Link>
              <button onClick={() => remove(s.id)} aria-label="Delete saved search" className="rounded-md p-1.5 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Link to="/browse" className="mt-3 inline-flex items-center gap-1 text-xs text-primary hover:underline">
        <Plus className="h-3 w-3" /> New search
      </Link>
    </div>
  );
}
