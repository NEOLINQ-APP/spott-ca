import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitLead, type LeadInputT } from "@/lib/leads.functions";
import { toast } from "sonner";
import { Loader2, CheckCircle2 } from "lucide-react";

type LeadType = "test_drive" | "trade_in" | "cash_offer" | "contact";

type Props = {
  leadType: LeadType;
  vehicleId?: string | null;
  defaultValues?: Partial<LeadInputT>;
  showVehicleFields?: boolean;
  showSchedule?: boolean;
  submitLabel?: string;
};

const FIELD = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40";

function fmtCents(c?: number | null) {
  if (c == null) return null;
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(c / 100);
}

export function LeadForm({ leadType, vehicleId, defaultValues, showVehicleFields, showSchedule, submitLabel }: Props) {
  const submit = useServerFn(submitLead);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<null | {
    id: string;
    ai_estimate_low_cents: number | null;
    ai_estimate_high_cents: number | null;
    ai_notes: string | null;
  }>(null);
  const [form, setForm] = useState<LeadInputT>({
    lead_type: leadType,
    vehicle_id: vehicleId ?? null,
    full_name: "",
    email: "",
    phone: "",
    city: "",
    province: "",
    preferred_date: null,
    preferred_time: "",
    message: "",
    vin: "",
    year: null,
    make: "",
    model: "",
    trim: "",
    mileage_km: null,
    condition: "",
    asking_price_cents: null,
    ...defaultValues,
  });

  const set = <K extends keyof LeadInputT>(k: K, v: LeadInputT[K]) => setForm((f) => ({ ...f, [k]: v }));

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setBusy(true);
    try {
      const res = await submit({ data: form });
      setDone(res);
      toast.success("Submitted! We'll be in touch shortly.");
    } catch (err: any) {
      toast.error(err?.message ?? "Couldn't submit");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    const hasEstimate = done.ai_estimate_low_cents != null && done.ai_estimate_high_cents != null;
    return (
      <div className="rounded-xl border border-border bg-card p-6 text-center">
        <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
        <h3 className="mt-3 font-display text-xl font-semibold">Request received</h3>
        <p className="mt-1 text-sm text-muted-foreground">Our team will reach out within 1 business day.</p>
        {hasEstimate && (
          <div className="mt-5 rounded-lg border border-border bg-muted/40 p-4 text-left">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">AI estimate range</div>
            <div className="mt-1 text-2xl font-bold text-primary">
              {fmtCents(done.ai_estimate_low_cents)} – {fmtCents(done.ai_estimate_high_cents)}
            </div>
            {done.ai_notes && <p className="mt-2 text-xs text-muted-foreground">{done.ai_notes}</p>}
            <p className="mt-3 text-[10px] text-muted-foreground">Estimate generated from current market comps. Final offer depends on inspection.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <input className={FIELD} placeholder="Full name *" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} required />
        <input type="email" className={FIELD} placeholder="Email *" value={form.email} onChange={(e) => set("email", e.target.value)} required />
        <input className={FIELD} placeholder="Phone" value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
        <input className={FIELD} placeholder="City" value={form.city ?? ""} onChange={(e) => set("city", e.target.value)} />
      </div>

      {showVehicleFields && (
        <div className="space-y-3 rounded-lg border border-border/60 bg-muted/30 p-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your vehicle</div>
          <div className="grid gap-3 sm:grid-cols-3">
            <input className={FIELD} placeholder="Year" inputMode="numeric" value={form.year ?? ""} onChange={(e) => set("year", e.target.value ? Number(e.target.value) : null)} />
            <input className={FIELD} placeholder="Make" value={form.make ?? ""} onChange={(e) => set("make", e.target.value)} />
            <input className={FIELD} placeholder="Model" value={form.model ?? ""} onChange={(e) => set("model", e.target.value)} />
            <input className={FIELD} placeholder="Trim" value={form.trim ?? ""} onChange={(e) => set("trim", e.target.value)} />
            <input className={FIELD} placeholder="Mileage (km)" inputMode="numeric" value={form.mileage_km ?? ""} onChange={(e) => set("mileage_km", e.target.value ? Number(e.target.value) : null)} />
            <select className={FIELD} value={form.condition ?? ""} onChange={(e) => set("condition", e.target.value || null)}>
              <option value="">Condition</option>
              <option value="excellent">Excellent</option>
              <option value="good">Good</option>
              <option value="fair">Fair</option>
              <option value="rough">Rough</option>
            </select>
          </div>
          <input className={FIELD} placeholder="VIN (optional)" value={form.vin ?? ""} onChange={(e) => set("vin", e.target.value.toUpperCase())} />
        </div>
      )}

      {showSchedule && (
        <div className="grid gap-3 sm:grid-cols-2">
          <input type="date" className={FIELD} value={form.preferred_date ?? ""} onChange={(e) => set("preferred_date", e.target.value || null)} />
          <input className={FIELD} placeholder="Preferred time (e.g. weekday afternoons)" value={form.preferred_time ?? ""} onChange={(e) => set("preferred_time", e.target.value)} />
        </div>
      )}

      <textarea className={`${FIELD} min-h-[90px]`} placeholder="Anything else we should know?" value={form.message ?? ""} onChange={(e) => set("message", e.target.value)} />

      <button type="submit" disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {submitLabel ?? "Submit request"}
      </button>
      <p className="text-center text-[11px] text-muted-foreground">By submitting, you agree to be contacted about your request.</p>
    </form>
  );
}
