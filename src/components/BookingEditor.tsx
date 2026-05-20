import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CalendarCheck, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

const PRESETS = [
  "Book a table",
  "Reserve now",
  "Book appointment",
  "Schedule a quote",
  "Request a callback",
];

export function BookingEditor({ businessId }: { businessId: string }) {
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("businesses")
        .select("booking_url,booking_label")
        .eq("id", businessId)
        .maybeSingle();
      setUrl((data as any)?.booking_url ?? "");
      setLabel((data as any)?.booking_label ?? "");
      setLoading(false);
    })();
  }, [businessId]);

  const save = async () => {
    setSaving(true);
    const clean = url.trim();
    if (clean && !/^https?:\/\//i.test(clean)) {
      toast.error("URL must start with http:// or https://");
      setSaving(false);
      return;
    }
    const { error } = await supabase
      .from("businesses")
      .update({
        booking_url: clean || null,
        booking_label: clean ? (label.trim() || "Book now") : null,
      })
      .eq("id", businessId);
    if (error) toast.error(error.message);
    else toast.success("Booking button updated");
    setSaving(false);
  };

  if (loading) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <h3 className="font-display text-lg font-semibold flex items-center gap-2">
        <CalendarCheck className="h-4 w-4 text-primary" /> Reservation / booking button
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        Paste a link from OpenTable, Calendly, Resy, Square, your own site — anything. We'll show a big button on your listing so customers can book in one tap.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_220px]">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Booking link (URL)</span>
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://calendly.com/your-business"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Button label</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            list={`booking-presets-${businessId}`}
            placeholder="Book a table"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <datalist id={`booking-presets-${businessId}`}>
            {PRESETS.map((p) => <option key={p} value={p} />)}
          </datalist>
        </label>
      </div>
      <div className="mt-3 flex justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Save
        </button>
      </div>
    </div>
  );
}
