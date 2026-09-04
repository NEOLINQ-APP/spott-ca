// SPOTT Auto customer application — the real 7-step wizard (About You,
// Vehicle, Financing, Contact, Consent, Review, Submit) from spec section
// 26. Works fully anonymously (spec section 10 — account creation happens
// AFTER submission), auto-saves via application_drafts (never
// localStorage for this data — spec section 28), never claims an
// approval anywhere on this page.
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/hooks/use-auth";
import { saveApplicationDraft, getApplicationDraft, submitApplication, recordApplicationStarted } from "@/lib/spott-lead-engine.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/vehicles/apply")({
  component: ApplyPage,
  head: () => ({
    meta: [
      { title: "Start Your Application — Spott Auto" },
      { name: "description", content: "Apply for vehicle financing on Spott.ca — connect with the right dealership in minutes." },
    ],
  }),
});

const STEPS = ["About You", "Vehicle", "Financing", "Contact", "Consent", "Review", "Submit"] as const;

type FormState = {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  city: string;
  province: string;
  postal_code: string;
  vehicle: {
    not_sure_yet: boolean;
    new_or_used: string;
    vehicle_type: string;
    make: string;
    model: string;
    year: string;
    budget: string;
    down_payment: string;
    trade_in: boolean;
    payment_frequency: string;
  };
  financing: {
    employment_status: string;
    employer: string;
    employment_duration: string;
    income: string;
    housing_status: string;
    monthly_housing_payment: string;
    drivers_license_status: string;
    additional_info: string;
  };
  contact_preference: string;
  consent: {
    application_submission: boolean;
    contact_permission: boolean;
    email_communication: boolean;
    sms_communication: boolean;
    privacy_policy: boolean;
    terms_of_service: boolean;
  };
};

const EMPTY_FORM: FormState = {
  first_name: "",
  last_name: "",
  email: "",
  phone: "",
  city: "",
  province: "",
  postal_code: "",
  vehicle: {
    not_sure_yet: false,
    new_or_used: "",
    vehicle_type: "",
    make: "",
    model: "",
    year: "",
    budget: "",
    down_payment: "",
    trade_in: false,
    payment_frequency: "",
  },
  financing: {
    employment_status: "",
    employer: "",
    employment_duration: "",
    income: "",
    housing_status: "",
    monthly_housing_payment: "",
    drivers_license_status: "",
    additional_info: "",
  },
  contact_preference: "email",
  consent: {
    application_submission: false,
    contact_permission: false,
    email_communication: false,
    sms_communication: false,
    privacy_policy: false,
    terms_of_service: false,
  },
};

const FIELD = "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40";

function parseCents(value: string): number | undefined {
  const n = Number(value.replace(/[^0-9.]/g, ""));
  if (!value || !Number.isFinite(n)) return undefined;
  return Math.round(n * 100);
}

function ApplyPage() {
  const { user } = useAuth();
  const saveDraft = useServerFn(saveApplicationDraft);
  const getDraft = useServerFn(getApplicationDraft);
  const submit = useServerFn(submitApplication);
  const recordStarted = useServerFn(recordApplicationStarted);

  const [vehicleId, setVehicleId] = useState<string | undefined>(undefined);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ application_code: string } | null>(null);
  const [restoredDraft, setRestoredDraft] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const vid = params.get("vehicle_id");
      if (vid) setVehicleId(vid);
    } catch {}
    getDraft()
      .then((d: any) => {
        if (d?.partial_data && Object.keys(d.partial_data).length) {
          setForm((f) => ({ ...f, ...d.partial_data }));
        }
      })
      .catch(() => {})
      .finally(() => setRestoredDraft(true));
    recordStarted().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced auto-save — only once the initial draft restore has happened,
  // so we never immediately overwrite a real saved draft with the empty
  // initial form state.
  useEffect(() => {
    if (!restoredDraft || result) return;
    const t = setTimeout(() => {
      saveDraft({ data: { partial_data: form as any } }).catch(() => {});
    }, 800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, restoredDraft, result]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));
  const setVehicle = (patch: Partial<FormState["vehicle"]>) => setForm((f) => ({ ...f, vehicle: { ...f.vehicle, ...patch } }));
  const setFinancing = (patch: Partial<FormState["financing"]>) => setForm((f) => ({ ...f, financing: { ...f.financing, ...patch } }));
  const setConsent = (patch: Partial<FormState["consent"]>) => setForm((f) => ({ ...f, consent: { ...f.consent, ...patch } }));

  const validateStep = (): string[] => {
    const errs: string[] = [];
    if (step === 0) {
      if (!form.first_name.trim()) errs.push("First name is required.");
      if (!form.last_name.trim()) errs.push("Last name is required.");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.push("A valid email is required.");
      if (form.phone.replace(/\D/g, "").length < 7) errs.push("A valid phone number is required.");
      if (!form.city.trim()) errs.push("City is required.");
      if (!form.province.trim()) errs.push("Province is required.");
      if (!form.postal_code.trim()) errs.push("Postal code is required.");
    } else if (step === 4) {
      if (!form.consent.application_submission) errs.push("You must consent to submitting this application.");
      if (!form.consent.privacy_policy) errs.push("You must accept the Privacy Policy.");
      if (!form.consent.terms_of_service) errs.push("You must accept the Terms of Service.");
    }
    return errs;
  };

  const goNext = () => {
    const errs = validateStep();
    setErrors(errs);
    if (errs.length) return;
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const goBack = () => {
    setErrors([]);
    setStep((s) => Math.max(s - 1, 0));
  };

  const doSubmit = async () => {
    const errs = validateStep();
    if (errs.length) { setErrors(errs); return; }
    setSubmitting(true);
    try {
      let utm: { utm_source?: string; utm_medium?: string; utm_campaign?: string } = {};
      try {
        const p = new URLSearchParams(window.location.search);
        utm = {
          utm_source: p.get("utm_source") ?? undefined,
          utm_medium: p.get("utm_medium") ?? undefined,
          utm_campaign: p.get("utm_campaign") ?? undefined,
        };
      } catch {}

      const res: any = await submit({
        data: {
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          contact_preference: form.contact_preference as any,
          city: form.city.trim(),
          province: form.province.trim(),
          postal_code: form.postal_code.trim(),
          vehicle_id: vehicleId,
          vehicle_interest: {
            not_sure_yet: form.vehicle.not_sure_yet,
            new_or_used: form.vehicle.new_or_used || undefined,
            vehicle_type: form.vehicle.vehicle_type || undefined,
            make: form.vehicle.make || undefined,
            model: form.vehicle.model || undefined,
            year: form.vehicle.year ? Number(form.vehicle.year) : undefined,
            budget_cents: parseCents(form.vehicle.budget),
            down_payment_cents: parseCents(form.vehicle.down_payment),
            trade_in: form.vehicle.trade_in,
            payment_frequency: form.vehicle.payment_frequency || undefined,
          },
          financing: {
            employment_status: form.financing.employment_status || undefined,
            employer: form.financing.employer || undefined,
            employment_duration: form.financing.employment_duration || undefined,
            income_cents: parseCents(form.financing.income),
            housing_status: form.financing.housing_status || undefined,
            monthly_housing_payment_cents: parseCents(form.financing.monthly_housing_payment),
            drivers_license_status: form.financing.drivers_license_status || undefined,
            additional_info: form.financing.additional_info || undefined,
          },
          consent: form.consent,
          ...utm,
        },
      });
      setResult({ application_code: res.application_code });
      setStep(6);
      toast.success("Application submitted!");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not submit — try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const progressPct = useMemo(() => ((step + 1) / STEPS.length) * 100, [step]);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-8 sm:py-12">
        {!result && (
          <div className="mb-6">
            <div className="mb-2 flex items-center justify-between text-xs font-medium text-muted-foreground">
              <span>YOUR APPLICATION</span>
              <span>STEP {step + 1} OF {STEPS.length}</span>
            </div>
            <Progress value={progressPct} />
            <h1 className="mt-3 font-display text-2xl font-semibold">{STEPS[step]}</h1>
          </div>
        )}

        {errors.length > 0 && (
          <div className="mb-4 rounded-md border border-rose-300 bg-rose-50 p-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300">
            <ul className="list-disc space-y-0.5 pl-4">
              {errors.map((e) => <li key={e}>{e}</li>)}
            </ul>
          </div>
        )}

        {step === 0 && (
          <div className="space-y-4 rounded-xl border border-border bg-card p-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="First name *"><Input className={FIELD} value={form.first_name} onChange={(e) => set("first_name", e.target.value)} /></Field>
              <Field label="Last name *"><Input className={FIELD} value={form.last_name} onChange={(e) => set("last_name", e.target.value)} /></Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Email *"><Input type="email" className={FIELD} value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
              <Field label="Phone *"><Input className={FIELD} value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="City *"><Input className={FIELD} value={form.city} onChange={(e) => set("city", e.target.value)} /></Field>
              <Field label="Province *"><Input className={FIELD} value={form.province} onChange={(e) => set("province", e.target.value)} /></Field>
              <Field label="Postal code *"><Input className={FIELD} value={form.postal_code} onChange={(e) => set("postal_code", e.target.value.toUpperCase())} /></Field>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4 rounded-xl border border-border bg-card p-5">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={form.vehicle.not_sure_yet} onCheckedChange={(c) => setVehicle({ not_sure_yet: !!c })} />
              I'm not sure yet
            </label>
            {!form.vehicle.not_sure_yet && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="New or used"><select className={FIELD} value={form.vehicle.new_or_used} onChange={(e) => setVehicle({ new_or_used: e.target.value })}><option value="">Select…</option><option value="new">New</option><option value="used">Used</option></select></Field>
                  <Field label="Vehicle type"><Input className={FIELD} placeholder="SUV, sedan, truck…" value={form.vehicle.vehicle_type} onChange={(e) => setVehicle({ vehicle_type: e.target.value })} /></Field>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  <Field label="Make"><Input className={FIELD} value={form.vehicle.make} onChange={(e) => setVehicle({ make: e.target.value })} /></Field>
                  <Field label="Model"><Input className={FIELD} value={form.vehicle.model} onChange={(e) => setVehicle({ model: e.target.value })} /></Field>
                  <Field label="Year"><Input className={FIELD} inputMode="numeric" value={form.vehicle.year} onChange={(e) => setVehicle({ year: e.target.value })} /></Field>
                </div>
              </>
            )}
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Budget"><Input className={FIELD} placeholder="$" inputMode="decimal" value={form.vehicle.budget} onChange={(e) => setVehicle({ budget: e.target.value })} /></Field>
              <Field label="Estimated down payment"><Input className={FIELD} placeholder="$" inputMode="decimal" value={form.vehicle.down_payment} onChange={(e) => setVehicle({ down_payment: e.target.value })} /></Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-center gap-2 text-sm"><Checkbox checked={form.vehicle.trade_in} onCheckedChange={(c) => setVehicle({ trade_in: !!c })} /> I have a trade-in</label>
              <Field label="Desired payment frequency"><select className={FIELD} value={form.vehicle.payment_frequency} onChange={(e) => setVehicle({ payment_frequency: e.target.value })}><option value="">Select…</option><option value="weekly">Weekly</option><option value="biweekly">Biweekly</option><option value="monthly">Monthly</option></select></Field>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 rounded-xl border border-border bg-card p-5">
            <p className="text-xs text-muted-foreground">This helps connect you with the right financing option — it is not a credit check or lending decision.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Employment status"><Input className={FIELD} value={form.financing.employment_status} onChange={(e) => setFinancing({ employment_status: e.target.value })} /></Field>
              <Field label="Employer"><Input className={FIELD} value={form.financing.employer} onChange={(e) => setFinancing({ employer: e.target.value })} /></Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Employment duration"><Input className={FIELD} placeholder="e.g. 2 years" value={form.financing.employment_duration} onChange={(e) => setFinancing({ employment_duration: e.target.value })} /></Field>
              <Field label="Annual income"><Input className={FIELD} placeholder="$" inputMode="decimal" value={form.financing.income} onChange={(e) => setFinancing({ income: e.target.value })} /></Field>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Housing status"><select className={FIELD} value={form.financing.housing_status} onChange={(e) => setFinancing({ housing_status: e.target.value })}><option value="">Select…</option><option value="own">Own</option><option value="rent">Rent</option><option value="other">Other</option></select></Field>
              <Field label="Monthly housing payment"><Input className={FIELD} placeholder="$" inputMode="decimal" value={form.financing.monthly_housing_payment} onChange={(e) => setFinancing({ monthly_housing_payment: e.target.value })} /></Field>
            </div>
            <Field label="Driver's licence status"><Input className={FIELD} value={form.financing.drivers_license_status} onChange={(e) => setFinancing({ drivers_license_status: e.target.value })} /></Field>
            <Field label="Additional information"><Textarea className={FIELD} rows={3} value={form.financing.additional_info} onChange={(e) => setFinancing({ additional_info: e.target.value })} /></Field>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4 rounded-xl border border-border bg-card p-5">
            <Field label="Preferred contact method">
              <select className={FIELD} value={form.contact_preference} onChange={(e) => set("contact_preference", e.target.value)}>
                <option value="email">Email</option>
                <option value="phone">Phone call</option>
                <option value="sms">Text message</option>
              </select>
            </Field>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3 rounded-xl border border-border bg-card p-5">
            <ConsentRow label="I consent to submitting this application *" checked={form.consent.application_submission} onChange={(v) => setConsent({ application_submission: v })} />
            <ConsentRow label="I give permission to be contacted about this application" checked={form.consent.contact_permission} onChange={(v) => setConsent({ contact_permission: v })} />
            <ConsentRow label="I consent to receive email communication" checked={form.consent.email_communication} onChange={(v) => setConsent({ email_communication: v })} />
            <ConsentRow label="I consent to receive SMS communication" checked={form.consent.sms_communication} onChange={(v) => setConsent({ sms_communication: v })} />
            <ConsentRow label="I have read and accept the Privacy Policy *" checked={form.consent.privacy_policy} onChange={(v) => setConsent({ privacy_policy: v })} />
            <ConsentRow label="I have read and accept the Terms of Service *" checked={form.consent.terms_of_service} onChange={(v) => setConsent({ terms_of_service: v })} />
            <p className="pt-2 text-xs text-muted-foreground">Your information is securely submitted to help connect you with the appropriate automotive provider.</p>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-4">
            <ReviewSection title="About you" onEdit={() => setStep(0)}>
              <div>{form.first_name} {form.last_name}</div>
              <div>{form.email} · {form.phone}</div>
              <div>{form.city}, {form.province} {form.postal_code}</div>
            </ReviewSection>
            <ReviewSection title="Vehicle" onEdit={() => setStep(1)}>
              {form.vehicle.not_sure_yet ? <div>Not sure yet</div> : (
                <div>{[form.vehicle.year, form.vehicle.make, form.vehicle.model].filter(Boolean).join(" ") || "—"}</div>
              )}
            </ReviewSection>
            <ReviewSection title="Financing" onEdit={() => setStep(2)}>
              <div>{form.financing.employment_status || "—"}{form.financing.employer ? ` at ${form.financing.employer}` : ""}</div>
            </ReviewSection>
            <ReviewSection title="Contact preference" onEdit={() => setStep(3)}>
              <div className="capitalize">{form.contact_preference}</div>
            </ReviewSection>
            <div className="rounded-xl border border-border bg-card p-5">
              <Button onClick={doSubmit} disabled={submitting} className="w-full">
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Submit application
              </Button>
              <p className="mt-3 text-center text-[11px] text-muted-foreground">Your information is securely submitted to help connect you with the appropriate automotive provider — this is not a financing approval.</p>
            </div>
          </div>
        )}

        {step === 6 && result && (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h2 className="mt-4 font-display text-2xl font-semibold">Application received</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Your application <strong className="text-foreground">{result.application_code}</strong> has been securely submitted. We'll be in touch shortly.
            </p>
            {!user && (
              <p className="mt-4 text-sm">
                <Link to="/auth" className="font-medium text-primary hover:underline">Create an account</Link> to track your application status.
              </p>
            )}
            {user && (
              <Button asChild className="mt-4"><Link to="/dashboard">View in your dashboard</Link></Button>
            )}
          </div>
        )}

        {step < 5 && (
          <div className="mt-6 flex items-center justify-between">
            <Button variant="ghost" onClick={goBack} disabled={step === 0}>
              <ChevronLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            <Button onClick={goNext}>
              Next <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        )}
        {step === 5 && (
          <div className="mt-4">
            <Button variant="ghost" onClick={() => setStep(4)}><ChevronLeft className="mr-1 h-4 w-4" /> Back</Button>
          </div>
        )}
      </main>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><Label className="mb-1 block text-sm">{label}</Label>{children}</div>;
}

function ConsentRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 rounded-md border border-border p-3 text-sm hover:bg-muted/40">
      <Checkbox checked={checked} onCheckedChange={(c) => onChange(!!c)} className="mt-0.5" />
      <span>{label}</span>
    </label>
  );
}

function ReviewSection({ title, onEdit, children }: { title: string; onEdit: () => void; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <button onClick={onEdit} className="text-xs font-medium text-primary hover:underline">Edit</button>
      </div>
      <div className="space-y-0.5 text-sm text-muted-foreground">{children}</div>
    </div>
  );
}
