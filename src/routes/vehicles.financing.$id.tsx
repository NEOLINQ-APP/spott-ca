// SPOTT Auto financing intake — replaces the vehicle detail page's disabled
// "Financing inquiry — Soon" button. Mirrors vehicles.test-drive.$id.tsx's
// page shape; writes to financing_applications (not vehicle_leads), since a
// financing application carries its own submitted->funded lifecycle and can
// exist without a specific already-listed vehicle in the future.
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getVehicle } from "@/lib/vehicles.functions";
import { submitFinancingApplication, recordSpottAutoEvent } from "@/lib/spott-auto.functions";
import { useAuth } from "@/hooks/use-auth";
import { CreditCard, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/vehicles/financing/$id")({
  component: FinancingPage,
  head: () => ({
    meta: [
      { title: "Financing Inquiry — Spott Vehicles" },
      { name: "description", content: "Request financing information for a vehicle listed on Spott." },
    ],
  }),
});

const FIELD = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40";

function FinancingPage() {
  const { id } = useParams({ from: "/vehicles/financing/$id" });
  const { user } = useAuth();
  const fetchVehicle = useServerFn(getVehicle);
  const submit = useServerFn(submitFinancingApplication);
  const recordEvent = useServerFn(recordSpottAutoEvent);
  const [v, setV] = useState<any>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: user?.email ?? "", phone: "", city: "", province: "" });

  useEffect(() => {
    let cancelled = false;
    fetchVehicle({ data: { id } }).then((d) => { if (!cancelled) setV(d); }).catch(() => {});
    // Arriving here is the real "started an application" moment.
    recordEvent({ data: { event_type: "application_started", resource_id: id } }).catch(() => {});
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const set = (k: keyof typeof form, val: string) => setForm((f) => ({ ...f, [k]: val }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name.trim() || !form.email.trim()) { toast.error("Name and email are required"); return; }
    setBusy(true);
    try {
      await submit({ data: { vehicle_id: id, ...form, phone: form.phone || undefined, city: form.city || undefined, province: form.province || undefined } });
      setDone(true);
      toast.success("Financing inquiry submitted!");
    } catch (err: any) {
      toast.error(err?.message ?? "Couldn't submit");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link to="/vehicles/$id" params={{ id }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to vehicle
      </Link>
      <div className="mt-4 text-center">
        <CreditCard className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-3 font-display text-3xl font-semibold">Financing Inquiry</h1>
        {v ? (
          <p className="mt-2 text-sm text-muted-foreground">For <span className="font-medium text-foreground">{v.title}</span></p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Tell us a bit about yourself and we'll follow up with financing options.</p>
        )}
      </div>

      <div className="mt-6">
        {done ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-500" />
            <h3 className="mt-3 font-display text-xl font-semibold">Request received</h3>
            <p className="mt-1 text-sm text-muted-foreground">The dealership will reach out about financing options within 1 business day.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4 rounded-xl border border-border bg-card p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <input className={FIELD} placeholder="Full name *" value={form.full_name} onChange={(e) => set("full_name", e.target.value)} required />
              <input type="email" className={FIELD} placeholder="Email *" value={form.email} onChange={(e) => set("email", e.target.value)} required />
              <input className={FIELD} placeholder="Phone" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
              <input className={FIELD} placeholder="City" value={form.city} onChange={(e) => set("city", e.target.value)} />
              <input className={FIELD} placeholder="Province" value={form.province} onChange={(e) => set("province", e.target.value)} />
            </div>
            <button type="submit" disabled={busy} className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Submit financing inquiry
            </button>
            <p className="text-center text-[11px] text-muted-foreground">By submitting, you agree to be contacted about financing this vehicle.</p>
          </form>
        )}
      </div>
    </div>
  );
}
