import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Save, Search, Star, Lock } from "lucide-react";
import * as Icons from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { updateBusinessFeatures } from "@/lib/features.functions";

type Feature = { id: string; slug: string; label: string; icon: string | null; category: string; sort_order: number };

const CATEGORY_LABELS: Record<string, string> = {
  general: "General Amenities",
  food: "Food & Hospitality",
  retail: "Retail & Shopping",
  beauty: "Beauty & Wellness",
  automotive: "Automotive",
  entertainment: "Entertainment & Events",
  professional: "Professional Services",
  fitness: "Fitness",
  hotels: "Hotels",
};
const CATEGORY_ORDER = ["general", "food", "retail", "beauty", "automotive", "entertainment", "professional", "fitness", "hotels"];

export function FeatureIcon({ name, className }: { name: string | null | undefined; className?: string }) {
  if (!name) return null;
  const Comp = (Icons as any)[name];
  if (!Comp) return <span className={className}>•</span>;
  return <Comp className={className} />;
}

type Props = {
  businessId: string;
  highlightsUntil?: string | null;
};

export function FeaturesEditor({ businessId, highlightsUntil }: Props) {
  const update = useServerFn(updateBusinessFeatures);
  const [catalog, setCatalog] = useState<Feature[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [highlighted, setHighlighted] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [q, setQ] = useState("");

  const highlightsActive = !!highlightsUntil && new Date(highlightsUntil).getTime() > Date.now();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [{ data: feats }, { data: rels }] = await Promise.all([
        supabase.from("features").select("id,slug,label,icon,category,sort_order").eq("is_active", true).order("category").order("sort_order"),
        supabase.from("business_features").select("feature_id,is_highlighted").eq("business_id", businessId),
      ]);
      if (cancelled) return;
      setCatalog((feats ?? []) as Feature[]);
      const s = new Set<string>();
      const h = new Set<string>();
      for (const r of (rels ?? []) as any[]) {
        s.add(r.feature_id);
        if (r.is_highlighted) h.add(r.feature_id);
      }
      setSelected(s);
      setHighlighted(h);
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [businessId]);

  const grouped = useMemo(() => {
    const ql = q.trim().toLowerCase();
    const out = new Map<string, Feature[]>();
    for (const f of catalog) {
      if (ql && !f.label.toLowerCase().includes(ql)) continue;
      if (!out.has(f.category)) out.set(f.category, []);
      out.get(f.category)!.push(f);
    }
    return out;
  }, [catalog, q]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        setHighlighted((h) => { const n = new Set(h); n.delete(id); return n; });
      } else next.add(id);
      return next;
    });
  };

  const toggleHighlight = (id: string) => {
    if (!highlightsActive) { toast.info("Buy the Featured Highlights add-on to boost up to 2 features."); return; }
    if (!selected.has(id)) { toast.info("Select the feature first."); return; }
    setHighlighted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        if (next.size >= 2) { toast.info("Maximum 2 highlighted features."); return prev; }
        next.add(id);
      }
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      await update({ data: { business_id: businessId, feature_ids: [...selected], highlighted_ids: [...highlighted] } });
      toast.success("Features saved.");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save");
    } finally { setSaving(false); }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Features & amenities</div>
          <div className="text-xs text-muted-foreground">
            {selected.size} selected · {highlighted.size}/2 highlighted
            {highlightsActive ? (
              <span className="ml-2 inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                <Star className="h-3 w-3" /> Highlights active until {new Date(highlightsUntil!).toLocaleDateString()}
              </span>
            ) : (
              <span className="ml-2 inline-flex items-center gap-1"><Lock className="h-3 w-3" /> Highlights add-on inactive</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-md border border-border bg-background/40 px-2">
            <Search className="h-3.5 w-3.5 text-muted-foreground" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Filter…" className="bg-transparent py-1.5 text-xs outline-none" />
          </div>
          <button
            type="button" onClick={save} disabled={saving || !loaded}
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
            {saving ? "Saving…" : "Save features"}
          </button>
        </div>
      </div>

      {!loaded ? (
        <div className="h-40 animate-pulse rounded-md bg-background/40" />
      ) : (
        <div className="space-y-4">
          {CATEGORY_ORDER.filter((c) => grouped.has(c)).map((cat) => (
            <div key={cat}>
              <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{CATEGORY_LABELS[cat] ?? cat}</div>
              <div className="flex flex-wrap gap-1.5">
                {grouped.get(cat)!.map((f) => {
                  const isSel = selected.has(f.id);
                  const isHi = highlighted.has(f.id);
                  return (
                    <div key={f.id} className="inline-flex items-stretch overflow-hidden rounded-full border border-border">
                      <button
                        type="button" onClick={() => toggle(f.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs ${isSel ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        <FeatureIcon name={f.icon} className="h-3 w-3" /> {f.label}
                      </button>
                      <button
                        type="button" onClick={() => toggleHighlight(f.id)}
                        title={highlightsActive ? "Highlight on listing card" : "Requires Featured Highlights add-on"}
                        className={`grid place-items-center border-l border-border px-2 ${isHi ? "bg-amber-500/15 text-amber-600 dark:text-amber-400" : "text-muted-foreground hover:text-foreground"}`}
                      >
                        <Star className={`h-3 w-3 ${isHi ? "fill-current" : ""}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
