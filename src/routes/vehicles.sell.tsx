import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { PROVINCES } from "@/lib/canada";
import { useServerFn } from "@tanstack/react-start";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { decodeVin, generateListingContent, createVehicle, type DecodedVin } from "@/lib/vehicles.functions";
import { Car, ScanLine, Sparkles, Upload, Loader2, ArrowRight, X, Pencil, Hash } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/vehicles/sell")({
  component: SellPage,
  head: () => ({ meta: [{ title: "Sell My Car — Spott Vehicles" }, { name: "description", content: "List your vehicle in minutes with the VIN decoder or manual entry." }] }),
});

type Mode = "vin" | "manual";
type Step = 0 | 1 | 2 | 3 | 4;

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 50 }, (_, i) => CURRENT_YEAR + 1 - i);

function SellPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const decode = useServerFn(decodeVin);
  const generate = useServerFn(generateListingContent);
  const create = useServerFn(createVehicle);

  const [step, setStep] = useState<Step>(0);
  const [mode, setMode] = useState<Mode>("vin");
  const [vin, setVin] = useState("");
  const [decoded, setDecoded] = useState<DecodedVin | null>(null);
  const [busy, setBusy] = useState(false);

  // Vehicle attribute state — used by both VIN and manual paths after Step 1.
  const [year, setYear] = useState<string>("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [trim, setTrim] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [engine, setEngine] = useState("");
  const [transmission, setTransmission] = useState("");
  const [drivetrain, setDrivetrain] = useState("");
  const [fuelType, setFuelType] = useState("");

  const [mileage, setMileage] = useState("");
  const [condition, setCondition] = useState<"excellent" | "good" | "average" | "rough">("good");
  const [exteriorColor, setExteriorColor] = useState("");
  const [interiorColor, setInteriorColor] = useState("");
  const [doors, setDoors] = useState("");
  const [seats, setSeats] = useState("");
  const [accidentHistory, setAccidentHistory] = useState("");
  const [cleanTitle, setCleanTitle] = useState<boolean | null>(null);
  const [rebuiltStatus, setRebuiltStatus] = useState<boolean | null>(null);
  const [financing, setFinancing] = useState(false);
  const [warranty, setWarranty] = useState(false);

  const [price, setPrice] = useState("");
  const [priceHint, setPriceHint] = useState<{ low: number | null; high: number | null }>({ low: null, high: null });
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("");
  const [notes, setNotes] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  const [hashtags, setHashtags] = useState<string[]>([]);

  const [files, setFiles] = useState<File[]>([]);
  const [locating, setLocating] = useState(false);

  const provNameToCode = (name: string) =>
    PROVINCES.find((p) => p.name.toLowerCase() === name.toLowerCase())?.code ?? "";

  const detectLocation = async (silent = false) => {
    setLocating(true);
    const tryIp = async () => {
      try {
        const r = await fetch("https://ipapi.co/json/");
        if (!r.ok) throw new Error();
        const j = await r.json();
        const cityName = j.city || "";
        const provCode = j.region_code || provNameToCode(j.region || "");
        if (cityName) setCity((c) => c || cityName);
        if (provCode) setProvince((p) => p || provCode);
        if ((cityName || provCode) && !silent) toast.success("Location filled in");
      } catch { if (!silent) toast.error("Couldn't detect location"); }
    };
    await tryIp();
    setLocating(false);
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

  const applyDecoded = (d: DecodedVin) => {
    setDecoded(d);
    setYear(d.year ? String(d.year) : "");
    setMake(d.make ?? "");
    setModel(d.model ?? "");
    setTrim(d.trim ?? "");
    setBodyType(d.body_type ?? "");
    setEngine(d.engine ?? "");
    setTransmission(d.transmission ?? "");
    setDrivetrain(d.drivetrain ?? "");
    setFuelType(d.fuel_type ?? "");
  };

  const runDecode = async () => {
    if (vin.trim().length < 11) return toast.error("Enter a valid VIN");
    setBusy(true);
    try {
      const d = await decode({ data: { vin: vin.trim() } });
      applyDecoded(d);
      setStep(2);
    } catch (e: any) {
      toast.error(e?.message ?? "VIN decode failed");
    } finally { setBusy(false); }
  };

  const goManual = () => {
    setMode("manual");
    setDecoded(null);
    setVin("");
    setStep(2);
  };

  const runGenerate = async () => {
    if (!year || !make || !model) return toast.error("Year, make and model are required");
    setBusy(true);
    try {
      const out = await generate({
        data: {
          year: year ? Number(year) : null,
          make: make || null,
          model: model || null,
          trim: trim || null,
          body_type: bodyType || null,
          mileage_km: mileage ? Number(mileage) : null,
          condition,
          province: province || null,
          notes: notes || undefined,
        },
      });
      setTitle(out.title);
      setDescription(out.description);
      setFeatures(out.features);
      setHashtags(out.hashtags);
      setPriceHint({ low: out.price_low, high: out.price_high });
      setStep(3);
    } catch (e: any) {
      toast.error(e?.message ?? "AI generation failed");
    } finally { setBusy(false); }
  };

  const onFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    setFiles((p) => [...p, ...Array.from(incoming)].slice(0, 12));
  };
  const removeFile = (i: number) => setFiles((p) => p.filter((_, idx) => idx !== i));

  const publish = async () => {
    if (!price || Number(price) <= 0) return toast.error("Set a price");
    if (!title.trim()) return toast.error("Title is required");
    setBusy(true);
    try {
      const paths: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        const ext = f.name.split(".").pop() || "jpg";
        const path = `${user.id}/${Date.now()}-${i}.${ext}`;
        const { error } = await supabase.storage.from("vehicle-photos").upload(path, f, { contentType: f.type });
        if (error) throw new Error(error.message);
        paths.push(path);
      }

      const result = await create({
        data: {
          vin: mode === "vin" && decoded ? decoded.vin : (vin.trim() || null),
          year: year ? Number(year) : null,
          make: make || null,
          model: model || null,
          trim: trim || null,
          body_type: bodyType || null,
          engine: engine || null,
          transmission: transmission || null,
          drivetrain: drivetrain || null,
          fuel_type: fuelType || null,
          exterior_color: exteriorColor || null,
          interior_color: interiorColor || null,
          doors: doors ? Number(doors) : null,
          seats: seats ? Number(seats) : null,
          accident_history: accidentHistory || null,
          clean_title: cleanTitle,
          rebuilt_status: rebuiltStatus,
          financing_available: financing,
          warranty_available: warranty,
          hashtags,
          title,
          description,
          features,
          mileage_km: mileage ? Number(mileage) : null,
          condition,
          price_cents: Math.round(Number(price) * 100),
          city: city || null,
          province: province || null,
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
      <p className="mt-1 text-sm text-muted-foreground">VIN decoder or manual entry — both work.</p>

      {step > 0 && <Stepper step={step as 1 | 2 | 3 | 4} />}

      {step === 0 && (
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <button
            onClick={() => { setMode("vin"); setStep(1); }}
            className="group rounded-2xl border border-border bg-card p-6 text-left transition hover:border-primary hover:shadow-lg"
          >
            <ScanLine className="h-8 w-8 text-primary" />
            <h2 className="mt-3 font-semibold">Decode my VIN</h2>
            <p className="mt-1 text-xs text-muted-foreground">Fastest option — auto-fills year, make, model, trim, engine, transmission, drivetrain, fuel and more from your 17-character VIN.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:gap-2 transition-all">Use VIN <ArrowRight className="h-3 w-3" /></span>
          </button>
          <button
            onClick={goManual}
            className="group rounded-2xl border border-border bg-card p-6 text-left transition hover:border-primary hover:shadow-lg"
          >
            <Pencil className="h-8 w-8 text-primary" />
            <h2 className="mt-3 font-semibold">Enter manually</h2>
            <p className="mt-1 text-xs text-muted-foreground">Pick year, make, model and trim from a list. Use this if you don't have your VIN handy.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary group-hover:gap-2 transition-all">Manual entry <ArrowRight className="h-3 w-3" /></span>
          </button>
        </div>
      )}

      {step === 1 && (
        <Card>
          <h2 className="font-semibold">Enter your VIN</h2>
          <p className="mt-1 text-xs text-muted-foreground">17 characters. Found on the dashboard, driver's door jamb, or insurance card.</p>
          <input
            value={vin}
            onChange={(e) => setVin(e.target.value.toUpperCase())}
            placeholder="e.g. 1HGCM82633A123456"
            className="mt-3 w-full rounded-md border border-border bg-background p-3 font-mono uppercase"
            maxLength={17}
            autoCapitalize="characters"
          />
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <button onClick={runDecode} disabled={busy} className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />} Decode VIN <ArrowRight className="h-4 w-4" />
            </button>
            <button onClick={goManual} className="rounded-md border border-border bg-card px-4 py-3 text-sm font-medium hover:bg-muted/50">
              Skip — enter manually
            </button>
          </div>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <h2 className="font-semibold">{mode === "vin" ? "Review decoded details" : "Vehicle details"}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{mode === "vin" ? "We filled in what the VIN gave us — edit anything that's off, then add the rest." : "Fill in your vehicle details. Required: year, make, model."}</p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <Field label="Year *">
              <select value={year} onChange={(e) => setYear(e.target.value)} className="inp">
                <option value="">Select year</option>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </Field>
            <Field label="Make *"><input value={make} onChange={(e) => setMake(e.target.value)} className="inp" placeholder="Ford" /></Field>
            <Field label="Model *"><input value={model} onChange={(e) => setModel(e.target.value)} className="inp" placeholder="F-150" /></Field>
            <Field label="Trim"><input value={trim} onChange={(e) => setTrim(e.target.value)} className="inp" placeholder="Lariat" /></Field>
            <Field label="Body style"><input value={bodyType} onChange={(e) => setBodyType(e.target.value)} className="inp" placeholder="Pickup / SUV / Sedan" /></Field>
            <Field label="Engine"><input value={engine} onChange={(e) => setEngine(e.target.value)} className="inp" placeholder="3.5L V6" /></Field>
            <Field label="Transmission"><input value={transmission} onChange={(e) => setTransmission(e.target.value)} className="inp" placeholder="Automatic" /></Field>
            <Field label="Drive type"><input value={drivetrain} onChange={(e) => setDrivetrain(e.target.value)} className="inp" placeholder="4WD / AWD / FWD / RWD" /></Field>
            <Field label="Fuel type"><input value={fuelType} onChange={(e) => setFuelType(e.target.value)} className="inp" placeholder="Gasoline" /></Field>
            <Field label="Mileage (km)"><input value={mileage} onChange={(e) => setMileage(e.target.value)} type="number" className="inp" /></Field>
            <Field label="Condition">
              <select value={condition} onChange={(e) => setCondition(e.target.value as any)} className="inp">
                <option value="excellent">Excellent</option>
                <option value="good">Good</option>
                <option value="average">Average</option>
                <option value="rough">Rough</option>
              </select>
            </Field>
            <Field label="Exterior color"><input value={exteriorColor} onChange={(e) => setExteriorColor(e.target.value)} className="inp" placeholder="Pearl White" /></Field>
            <Field label="Interior color"><input value={interiorColor} onChange={(e) => setInteriorColor(e.target.value)} className="inp" placeholder="Black leather" /></Field>
            <Field label="Doors"><input value={doors} onChange={(e) => setDoors(e.target.value)} type="number" className="inp" placeholder="4" /></Field>
            <Field label="Seating capacity"><input value={seats} onChange={(e) => setSeats(e.target.value)} type="number" className="inp" placeholder="5" /></Field>
            <Field label="City">
              <div className="flex gap-2">
                <input value={city} onChange={(e) => setCity(e.target.value)} className="inp" />
                <button type="button" onClick={() => detectLocation(false)} disabled={locating} className="shrink-0 rounded-md border border-border bg-background px-2 text-xs text-muted-foreground hover:text-primary disabled:opacity-50">
                  {locating ? "…" : "Detect"}
                </button>
              </div>
            </Field>
            <Field label="Province">
              <select value={province} onChange={(e) => setProvince(e.target.value)} className="inp">
                <option value="">Select</option>
                {PROVINCES.map((p) => <option key={p.code} value={p.code}>{p.code} — {p.name}</option>)}
              </select>
            </Field>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <TriToggle label="Clean title" value={cleanTitle} onChange={setCleanTitle} />
            <TriToggle label="Rebuilt / salvage" value={rebuiltStatus} onChange={setRebuiltStatus} />
            <CheckRow label="Financing available" checked={financing} onChange={setFinancing} />
            <CheckRow label="Warranty available" checked={warranty} onChange={setWarranty} />
          </div>

          <Field label="Accident history (optional)" full>
            <textarea value={accidentHistory} onChange={(e) => setAccidentHistory(e.target.value)} rows={2} placeholder="e.g. Minor rear bumper repair 2022, otherwise accident-free" className="inp" />
          </Field>

          <Field label="Notes for AI (optional)" full>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Recent work, included accessories, anything to highlight…" className="inp" />
          </Field>

          <button onClick={runGenerate} disabled={busy} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Generate listing with AI
          </button>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <h2 className="font-semibold">Review & edit</h2>
          <p className="mt-1 text-xs text-muted-foreground">AI drafted the copy and hashtags — tweak anything.</p>

          <Field label="Title" full><input value={title} onChange={(e) => setTitle(e.target.value)} className="inp" /></Field>

          <Field label={`Asking price (CAD)${priceHint.low && priceHint.high ? ` — suggested $${priceHint.low.toLocaleString()}–$${priceHint.high.toLocaleString()}` : ""}`} full>
            <input value={price} onChange={(e) => setPrice(e.target.value)} type="number" placeholder="15000" className="inp" />
          </Field>

          <Field label="Description" full><textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={6} className="inp" /></Field>

          <Field label="Features (comma-separated)" full>
            <input value={features.join(", ")} onChange={(e) => setFeatures(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} className="inp" />
          </Field>

          <Field label="Hashtags" full>
            <div className="mb-2 flex flex-wrap gap-1.5">
              {hashtags.map((t, i) => (
                <span key={i} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-xs text-primary">
                  {t}
                  <button onClick={() => setHashtags(hashtags.filter((_, idx) => idx !== i))} className="hover:text-foreground"><X className="h-3 w-3" /></button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                placeholder="#AddTag"
                className="inp"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const raw = (e.target as HTMLInputElement).value.trim();
                    if (!raw) return;
                    const tag = (raw.startsWith("#") ? raw : `#${raw}`).replace(/\s+/g, "");
                    if (tag.length > 1 && !hashtags.includes(tag) && hashtags.length < 20) {
                      setHashtags([...hashtags, tag]);
                    }
                    (e.target as HTMLInputElement).value = "";
                  }
                }}
              />
              <span className="inline-flex items-center text-xs text-muted-foreground"><Hash className="mr-1 h-3 w-3" />Press Enter</span>
            </div>
          </Field>

          <button onClick={() => setStep(4)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground">
            Continue to photos <ArrowRight className="h-4 w-4" />
          </button>
        </Card>
      )}

      {step === 4 && (
        <Card>
          <h2 className="font-semibold">Photos & publish</h2>
          <p className="mt-1 text-xs text-muted-foreground">Up to 12 photos. The first one is your cover.</p>

          <label className="mt-3 flex cursor-pointer items-center justify-center gap-2 rounded-md border-2 border-dashed border-border bg-background p-6 text-sm text-muted-foreground hover:border-primary/50">
            <Upload className="h-5 w-5" /> Tap to add photos
            <input type="file" accept="image/*" multiple onChange={(e) => onFiles(e.target.files)} className="hidden" />
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

      <style>{`.inp{width:100%;border-radius:0.5rem;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:0.5rem 0.625rem;font-size:0.875rem;outline:none}.inp:focus{border-color:hsl(var(--primary));box-shadow:0 0 0 3px hsl(var(--primary)/0.15)}`}</style>
    </div>
  );
}

function Stepper({ step }: { step: 1 | 2 | 3 | 4 }) {
  const labels = ["Method", "Details", "Review", "Publish"];
  return (
    <div className="mt-6 flex items-center gap-2">
      {labels.map((l, i) => {
        const n = (i + 1) as 1 | 2 | 3 | 4;
        const active = step === n;
        const done = step > n;
        return (
          <div key={l} className="flex flex-1 items-center gap-2">
            <div className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${active ? "bg-primary text-primary-foreground" : done ? "bg-primary/30 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{n}</div>
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
function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? "mt-3 sm:col-span-2" : ""}>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
    </div>
  );
}
function CheckRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
function TriToggle({ label, value, onChange }: { label: string; value: boolean | null; onChange: (v: boolean | null) => void }) {
  const opts: Array<{ v: boolean | null; t: string }> = [
    { v: null, t: "—" },
    { v: true, t: "Yes" },
    { v: false, t: "No" },
  ];
  return (
    <div className="rounded-md border border-border bg-background p-2">
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      <div className="flex gap-1">
        {opts.map((o) => (
          <button
            key={String(o.v)}
            onClick={() => onChange(o.v)}
            className={`flex-1 rounded px-2 py-1 text-xs ${value === o.v ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
          >
            {o.t}
          </button>
        ))}
      </div>
    </div>
  );
}
