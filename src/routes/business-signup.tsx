import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { toast } from "sonner";
import { Combobox } from "@/components/ui/combobox";
import { PROVINCES, searchCities, CITIES_BY_PROVINCE } from "@/lib/canada";
import { ShieldCheck, Upload, Building2, FileText, X } from "lucide-react";

export const Route = createFileRoute("/business-signup")({
  component: BusinessSignupPage,
  head: () => ({
    meta: [
      { title: "Business sign up — Spott" },
      {
        name: "description",
        content:
          "Register your Canadian business — restaurant, shop, dealership, service — on Spott. Submit verification documents to unlock your business directory profile and marketplace seller tools.",
      },
      { property: "og:title", content: "List your business on Spott" },
      {
        property: "og:description",
        content: "Get verified, get discovered, and sell across the Spott marketplace.",
      },
      { property: "og:url", content: "https://www.spott.ca/business-signup" },
    ],
    links: [{ rel: "canonical", href: "https://www.spott.ca/business-signup" }],
  }),
});

const BUSINESS_TYPES = [
  "Sole Proprietorship",
  "Partnership",
  "Corporation / Inc.",
  "LLC",
  "Dealership (Auto / Equipment)",
  "Franchise",
  "Non-profit",
  "Other",
];

function BusinessSignupPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Form state
  const [businessName, setBusinessName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [businessType, setBusinessType] = useState(BUSINESS_TYPES[0]);
  const [taxNumber, setTaxNumber] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [postal, setPostal] = useState("");
  const [files, setFiles] = useState<File[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        toast.error("Please sign in first to register your business.");
        navigate({ to: "/auth", search: { tab: "business" } });
        return;
      }
      setUserId(data.user.id);
      if (data.user.email && !email) setEmail(data.user.email);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cityItems = (city.trim()
    ? searchCities(city, 8)
    : province
      ? (CITIES_BY_PROVINCE[province] || []).slice(0, 8).map((c) => ({ city: c, province }))
      : []
  ).map((c) => ({ value: c.city, label: c.city, sub: c.province }));

  const onPickFiles = (list: FileList | null) => {
    if (!list) return;
    const next = Array.from(list).filter((f) => f.size <= 10 * 1024 * 1024); // 10MB each
    if (next.length !== list.length) toast.error("Each file must be 10MB or smaller");
    setFiles((prev) => [...prev, ...next].slice(0, 6));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    if (!businessName.trim() || !email.trim()) {
      toast.error("Business name and contact email are required");
      return;
    }
    if (files.length === 0) {
      toast.error("Please upload at least one verification document");
      return;
    }
    setBusy(true);
    try {
      // 1) Upload files to private bucket under {user_id}/...
      const paths: string[] = [];
      for (const f of files) {
        const ext = f.name.split(".").pop() ?? "bin";
        const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("business-verification")
          .upload(path, f, { upsert: false, contentType: f.type || undefined });
        if (upErr) throw upErr;
        paths.push(path);
      }

      // 2) Create the verification request
      const { error: vErr } = await supabase.from("business_verification_requests").insert({
        user_id: userId,
        business_name: businessName.trim(),
        legal_name: legalName.trim() || null,
        business_type: businessType,
        tax_number: taxNumber.trim() || null,
        contact_email: email.trim(),
        contact_phone: phone.trim() || null,
        website: website.trim() || null,
        address: address.trim() || null,
        city: city.trim() || null,
        province: province || null,
        postal_code: postal.trim() || null,
        document_paths: paths,
        status: "pending",
      });
      if (vErr) throw vErr;

      toast.success("Submitted! We'll review your documents within 1–2 business days.");
      navigate({ to: "/dashboard" });
    } catch (err: any) {
      toast.error(err.message ?? "Could not submit your application");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <ShieldCheck className="h-3.5 w-3.5" /> Verified business sign-up
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            List your business on Spott
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            One verification unlocks <strong>both</strong> your business directory profile and the marketplace seller tools — including
            featured placements, verified badges, and the ability to list inventory (dealerships, shops, services).
          </p>
        </div>

        <form onSubmit={submit} className="space-y-6 rounded-2xl border border-border bg-card/60 p-6">
          {/* Business details */}
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
              <Building2 className="h-4 w-4" /> Business details
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Business name *">
                <input required value={businessName} onChange={(e) => setBusinessName(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Legal / registered name">
                <input value={legalName} onChange={(e) => setLegalName(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Business type *">
                <select value={businessType} onChange={(e) => setBusinessType(e.target.value)} className={inputCls}>
                  {BUSINESS_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </Field>
              <Field label="Business / tax number (BN, GST/HST)">
                <input value={taxNumber} onChange={(e) => setTaxNumber(e.target.value)} className={inputCls} placeholder="e.g. 123456789RT0001" />
              </Field>
            </div>
          </section>

          {/* Contact */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Contact</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Email *">
                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Phone">
                <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
              </Field>
              <Field label="Website" className="sm:col-span-2">
                <input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://" className={inputCls} />
              </Field>
            </div>
          </section>

          {/* Location */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Location</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Street address" className="sm:col-span-2">
                <input value={address} onChange={(e) => setAddress(e.target.value)} className={inputCls} />
              </Field>
              <Field label="City">
                <Combobox
                  value={city}
                  onChange={setCity}
                  onPick={(it) => it.sub && setProvince(it.sub)}
                  items={cityItems}
                  placeholder="City"
                  inputClassName="w-full bg-transparent py-2 text-sm outline-none placeholder:text-muted-foreground"
                  containerClassName="rounded-md border border-border bg-background px-3"
                />
              </Field>
              <Field label="Province">
                <select value={province} onChange={(e) => setProvince(e.target.value)} className={inputCls}>
                  <option value="">—</option>
                  {PROVINCES.map((p) => (
                    <option key={p.code} value={p.code}>{p.name}</option>
                  ))}
                </select>
              </Field>
              <Field label="Postal code">
                <input value={postal} onChange={(e) => setPostal(e.target.value)} className={inputCls} />
              </Field>
            </div>
          </section>

          {/* Verification documents */}
          <section>
            <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
              <FileText className="h-4 w-4" /> Verification documents *
            </h2>
            <p className="mb-3 text-xs text-muted-foreground">
              Upload one or more of: business license, articles of incorporation, dealer license, GST/HST registration,
              municipal permit. Documents are private — only Spott reviewers can see them. PDF, JPG, PNG. Max 10MB each.
            </p>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-background px-4 py-6 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground">
              <Upload className="h-4 w-4" />
              <span>Click to upload (up to 6 files)</span>
              <input
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={(e) => onPickFiles(e.target.files)}
              />
            </label>
            {files.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {files.map((f, i) => (
                  <li key={i} className="flex items-center justify-between rounded-md border border-border bg-background px-3 py-2 text-xs">
                    <span className="truncate">{f.name} <span className="text-muted-foreground">· {(f.size / 1024 / 1024).toFixed(1)} MB</span></span>
                    <button
                      type="button"
                      onClick={() => setFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      className="text-muted-foreground hover:text-foreground"
                      aria-label="Remove file"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="flex flex-col gap-3 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              By submitting you confirm the information is accurate and agree to our{" "}
              <Link to="/terms" className="underline">Terms</Link>.
            </p>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {busy ? "Submitting…" : "Submit for verification"}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

const inputCls = "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary";

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block text-xs ${className}`}>
      <span className="mb-1 block font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
