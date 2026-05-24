import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { HoursEditor } from "@/components/HoursEditor";
import { PriceTierEditor } from "@/components/PriceTierEditor";
import { updateBusinessExtras } from "@/lib/business-extras.functions";
import type { BusinessHours } from "@/lib/hours";

type Props = {
  businessId: string;
  province?: string | null;
};

export function BusinessExtrasEditor({ businessId, province }: Props) {
  const update = useServerFn(updateBusinessExtras);
  const [hours, setHours] = useState<BusinessHours | null>(null);
  const [priceTier, setPriceTier] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("businesses")
        .select("hours,price_tier")
        .eq("id", businessId)
        .maybeSingle();
      if (cancelled) return;
      setHours(((data as any)?.hours ?? null) as BusinessHours | null);
      setPriceTier(((data as any)?.price_tier ?? null) as number | null);
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, [businessId]);

  const save = async () => {
    setSaving(true);
    try {
      await update({ data: { business_id: businessId, hours, price_tier: priceTier } });
      toast.success("Hours & pricing saved.");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save");
    } finally { setSaving(false); }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 text-sm font-medium">Hours & pricing</div>
      {!loaded ? (
        <div className="h-32 animate-pulse rounded-md bg-background/40" />
      ) : (
        <>
          <div className="grid gap-4 lg:grid-cols-2">
            <HoursEditor value={hours} onChange={setHours} province={province} />
            <PriceTierEditor value={priceTier} onChange={setPriceTier} />
          </div>
          <div className="mt-4 flex justify-end">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              {saving ? "Saving…" : "Save hours & pricing"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
