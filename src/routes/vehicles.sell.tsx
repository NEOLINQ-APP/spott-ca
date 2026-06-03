import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PROVINCES } from "@/lib/canada";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { decodeVin, generateListingContent, createVehicle, type DecodedVin } from "@/lib/vehicles.functions";
import { Car, ScanLine, Sparkles, Upload, Loader2, ArrowRight, X } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/vehicles/sell")({
  component: SellPage,
  head: () => ({ meta: [{ title: "Sell My Car — Spott Vehicles" }, { name: "description", content: "List your vehicle in minutes with AI-assisted posting." }] }),
});

type Step = 1 | 2 | 3 | 4;

function SellPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const decode = useServerFn(decodeVin);
  const generate = useServerFn(generateListingContent);
  const create = useServerFn(createVehicle);

  const [step, setStep] = useState<Step>(1);
  const [vin, setVin] = useState("");
  const [decoded, setDecoded] = useState<DecodedVin | null>(null);
  const [busy, setBusy] = useState(false);

  const [mileage, setMileage] = useState("");
  const [condition, setCondition] = useState<"excellent" | "good" | "average" | "rough">("good");
  const [price, setPrice] = useState("");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [notes, setNotes] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [features, setFeatures] = useState<string[]>([]);

  const [files, setFiles] = useState<File[]>([]);
  const [uploadedPaths, setUploadedPaths] = useState<string[]>([]);

  const [locating, setLocating] = useState(false);

  const provNameToCode = (name: string) =>
    PROVINCES.find((p) => p.name.toLowerCase() === name.toLowerCase())?.code ?? "";

  const applyLocation = (detectedCity?: string, provCode?: string) => {
    if (detectedCity) setCity((c) => c || detectedCity);
    if (provCode) setProvince((p) => p || provCode);
    if (detectedCity || provCode) toast.success("Location filled in");
  };

  const detectLocation = async (silent = false) => {
    setLocating(true);
    const tryIp = async () => {
      try {
        const r = await fetch("https://ipapi.co/json/");
        if (!r.ok) throw new Error("ip lookup failed");
        const j = await r.json();
        const cityName = j.city || "";
        const provCode = j.region_code || provNameToCode(j.region || "");
        applyLocation(cityName, provCode);
      } catch {
        if (!silent) toast.error("Couldn't detect location");
      }
    };
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      await tryIp();
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const r = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${pos.coords.latitude}&lon=${pos.coords.longitude}&zoom=10`,
            { headers: { Accept: "application/json" } },
          );
          const j = await r.json();
          const detectedCity = j.address?.city || j.address?.town || j.address?.village || j.address?.county || "";
          const provCode = provNameToCode(j.address?.state || "");
          if (detectedCity || provCode) applyLocation(detectedCity, provCode);
          else await tryIp();
        } catch {
          await tryIp();
        } finally {
          setLocating(false);
        }
      },
      async () => { await tryIp(); setLocating(false); },
      { timeout: 8000, maximumAge: 60_000 },
    );
  };

  useEffect(() => {
    if (step === 2 && !city && !province) detectLocation(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);


  if (loading) return <div className="p-12 text-center text-sm text-muted-foreground">Loading…</div>;
  if (!user) {
    return (
      <div className="mx-auto max-w-md p-12 text-center">
        <Car className="mx-auto h-10 w-10 text-muted-foreground" />
        <p className="mt-3 text-sm text-muted-foreground">Sign in to list your vehicle.</p>
        <button onClick={() => navigate({ to: "/auth" })} className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">Sign in</button>
      </div>
    );
  }

  const runDecode = async () => {
    if (vin.trim().length < 11) return toast.error("Enter a valid VIN");
    setBusy(true);
    try {
      const d = await decode({ data: { vin: vin.trim() } });
      setDecoded(d);
      setStep(2);
    } catch (e: any) {
      toast.error(e?.message ?? "VIN decode failed");
    } finally { setBusy(false); }
  };

  const runGenerate = async () => {
    if (!decoded) return;
    setBusy(true);
    try {
      const out = await generate({
        data: {
          year: decoded.year, make: decoded.make, model: decoded.model, trim: decoded.trim,
          body_type: decoded.body_type, mileage_km: mileage ? Number(mileage) : null,
          condition, notes: notes || undefined,
        },
      });
      setTitle(out.title);
      setDescription(out.description);
      setFeatures(out.features);
      setStep(3);
    } catch (e: any) {
      toast.error(e?.message ?? "AI generation failed");
    } finally { setBusy(false); }
  };

  const onFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const arr = Array.from(incoming).slice(0, 12);
    setFiles((prev) => [...prev, ...arr].slice(0, 12));
  };

  const removeFile = (i: number) => setFiles((p) => p.filter((_, idx) => idx !== i));

  const publish = async () => {
    if (!decoded) return;
    if (!price || Number(price) <= 0) return toast.error("Set a price");
    setBusy(true);
    try {
      // Upload photos
      const paths: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const ext = f.name.split(".").pop() || "jpg";
        const path = `${user.id}/${Date.now()}-${i}.${ext}`;
        const { error } = await supabase.storage.from("vehicle-photos").upload(path, f, { contentType: f.type });
        if (error) throw new Error(error.message);
        paths.push(path);
      }
      setUploadedPaths(paths);

      const result = await create({
        data: {
          vin: decoded.vin, year: decoded.year, make: decoded.make, model: decoded.model, trim: decoded.trim,
          body_type: decoded.body_type, engine: decoded.engine, transmission: decoded.transmission,
          drivetrain: decoded.drivetrain, fuel_type: decoded.fuel_type,
          title, description, features,
          mileage_km: mileage ? Number(mileage) : null, condition,
          price_cents: Math.round(Number(price) * 100),
          city: city || null, province: province || null,
          photo_paths: paths,
        },
      });
      toast.success("Listing published!");
      navigate({ to: "/vehicles/$id", params: { id: result.id } });
    } catch (e: any) {
      toast.error(e?.message ?? "Could not publish listing");
    } finally { setBusy(false); }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="font-display text-3xl font-semibold">Sell My Car</h1>
      <p className="mt-1 text-sm text-muted-foreground">AI-assisted listing in 4 quick steps.</p>

      <Stepper step={step} />

      {step === 1 && (
        <Card>
          <h2 className="font-semibold">Step 1 — Enter your VIN</h2>
          <p className="mt-1 text-xs text-muted-foreground">Your 17-character Vehicle Identification Number. Found on the dashboard, driver's door jamb, or insurance card.</p>
          <input
            value={vin}
            onChange={(e) => setVin(e.target.value.toUpperCase())}
            placeholder="e.g. 1HGCM82633A123456"
            className="mt-3 w-full rounded-md border border-border bg-background p-3 font-mono uppercase"
            maxLength={17}
            autoCapitalize="characters"
          />
          <p className="mt-2 text-xs text-muted-foreground inline-flex items-center gap-1"><ScanLine className="h-3 w-3" />Tip: on mobile, use the camera-enabled keyboard to read the barcode label.</p>
          <button onClick={runDecode} disabled={busy} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Decode VIN <ArrowRight className="h-4 w-4" />
          </button>
        </Card>
      )}

      {step === 2 && decoded && (
        <Card>
          <h2 className="font-semibold">Step 2 — Confirm details</h2>
          <p className="mt-1 text-xs text-muted-foreground">VIN decoded — fill in the rest, then we'll generate your listing copy.</p>
          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 rounded-md bg-muted/50 p-3 text-sm">
            <Row label="Year">{decoded.year ?? "—"}</Row>
            <Row label="Make">{decoded.make ?? "—"}</Row>
            <Row label="Model">{decoded.model ?? "—"}</Row>
            <Row label="Trim">{decoded.trim ?? "—"}</Row>
            <Row label="Body">{decoded.body_type ?? "—"}</Row>
            <Row label="Fuel">{decoded.fuel_type ?? "—"}</Row>
          </dl>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Mileage (km)"><input value={mileage} onChange={(e) => setMileage(e.target.value)} type="number" className="w-full rounded-md border border-border bg-background p-2" /></Field>
            <Field label="Condition">
              <select value={condition} onChange={(e) => setCondition(e.target.value as any)} className="w-full rounded-md border border-border bg-background p-2">
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="average">Average</option>
                <option value="rough">Rough</option>
              </select>
            </Field>
            <Field label="City">
              <div className="flex gap-2">
                <input value={city} onChange={(e) => setCity(e.target.value)} className="w-full rounded-md border border-border bg-background p-2" />
                <button type="button" onClick={() => detectLocation(false)} disabled={locating} className="shrink-0 rounded-md border border-border bg-background px-2 text-xs text-muted-foreground hover:text-primary disabled:opacity-50">
                  {locating ? "…" : "Detect"}
                </button>
              </div>
            </Field>
            <Field label="Province"><input value={province} onChange={(e) => setProvince(e.target.value.toUpperCase())} maxLength={2} placeholder="ON" className="w-full rounded-md border border-border bg-background p-2 uppercase" /></Field>
            <Field label="Notes for AI (optional)" full>
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Anything special — recent work, included accessories, known issues…" className="w-full rounded-md border border-border bg-background p-2" />
            </Field>
          </div>

          <button onClick={runGenerate} disabled={busy} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate listing with AI
          </button>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <h2 className="font-semibold">Step 3 — Review & edit</h2>
          <p className="mt-1 text-xs text-muted-foreground">AI drafted the copy — tweak anything you'd like.</p>

          <Field label="Title" full><input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-md border border-border bg-background p-2" /></Field>
          <Field label="Asking price (CAD)" full><input value={price} onChange={(e) => setPrice(e.target.value)} type="number" placeholder="15000" className="w-full rounded-md border border-border bg-background p-2" /></Field>
          <Field label="Description" full><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} className="w-full rounded-md border border-border bg-background p-2" /></Field>
          <Field label="Features (comma-separated)" full>
            <input
              value={features.join(", ")}
              onChange={(e) => setFeatures(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
              className="w-full rounded-md border border-border bg-background p-2"
            />
          </Field>

          <button onClick={() => setStep(4)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground">
            Continue to photos <ArrowRight className="h-4 w-4" />
          </button>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <h2 className="font-semibold">Step 4 — Photos & publish</h2>
          <p className="mt-1 text-xs text-muted-foreground">Up to 12 photos. The first one is your cover.</p>

          <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-background p-6 text-sm text-muted-foreground hover:border-primary/50">
            <Upload className="h-5 w-5" /> Tap to add photos
            <input type="file" accept="image/*" multiple capture="environment" onChange={(e) => onFiles(e.target.files)} className="hidden" />
          </label>

          {files.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
              {files.map((f, i) => (
                <div key={i} className="relative aspect-square overflow-hidden rounded-md border border-border">
                  <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                  <button onClick={() => removeFile(i)} className="absolute right-1 top-1 rounded-full bg-background/90 p-1"><X className="h-3 w-3" /></button>
                  {i === 0 && <span className="absolute left-1 top-1 rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">Cover</span>}
                </div>
              ))}
            </div>
          )}

          <button onClick={publish} disabled={busy} className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" />} Publish listing
          </button>
          <p className="mt-2 text-center text-xs text-muted-foreground">Free — boost options available after publishing.</p>
        </Card>
      )}
    </div>
  );
}

function Stepper({ step }: { step: Step }) {
  const labels = ["VIN", "Details", "Review", "Publish"];
  return (
    <div className="mt-6 flex items-center gap-2">
      {labels.map((l, i) => {
        const n = (i + 1) as Step;
        const active = step === n;
        const done = step > n;
        return (
          <div key={l} className="flex flex-1 items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${active ? "bg-primary text-primary-foreground" : done ? "bg-primary/30 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
              {n}
            </div>
            <div className={`text-xs ${active ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{l}</div>
            {i < labels.length - 1 && <div className="h-px flex-1 bg-border" />}
          </div>
        );
      })}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="mt-6 rounded-2xl border border-border bg-card p-5 sm:p-6">{children}</div>;
}
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (<><dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt><dd className="font-medium">{children}</dd></>);
}
function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? "mt-3 sm:col-span-2" : ""}>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
