import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tag, Clock } from "lucide-react";

interface Special {
  id: string;
  title: string;
  description: string | null;
  discount_label: string | null;
  ends_at: string | null;
}

export function BusinessSpecials({ businessId }: { businessId: string }) {
  const [items, setItems] = useState<Special[]>([]);
  useEffect(() => {
    supabase
      .from("specials")
      .select("id,title,description,discount_label,ends_at")
      .eq("business_id", businessId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        const now = new Date();
        setItems(((data ?? []) as Special[]).filter((s) => !s.ends_at || new Date(s.ends_at) > now));
      });
  }, [businessId]);

  if (items.length === 0) return null;
  return (
    <section className="mt-10">
      <h2 className="font-display text-xl font-semibold flex items-center gap-2">
        <Tag className="h-5 w-5 text-primary" /> Current specials
      </h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {items.map((s) => (
          <div key={s.id} className="rounded-xl border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-medium">{s.title}</h3>
              {s.discount_label && (
                <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                  {s.discount_label}
                </span>
              )}
            </div>
            {s.description && <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>}
            {s.ends_at && (
              <div className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" /> Until {new Date(s.ends_at).toLocaleDateString()}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
