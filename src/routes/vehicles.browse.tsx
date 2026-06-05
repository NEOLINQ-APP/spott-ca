import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listVehicles, signVehiclePhotoUrls } from "@/lib/vehicles.functions";
import { Car, MapPin, Gauge, ShieldCheck, User as UserIcon } from "lucide-react";

export const Route = createFileRoute("/vehicles/browse")({
  component: BrowsePage,
  head: () => ({
    meta: [
      { title: "Browse Vehicles — Spott" },
      { name: "description", content: "Search cars, trucks and SUVs for sale across Canada." },
    ],
    links: [{ rel: "canonical", href: "https://spott.ca/vehicles" }],
  }),
});

const BODY_TYPES = ["Sedan", "SUV", "Truck", "Coupe", "Hatchback", "Minivan", "Convertible", "Wagon"];
const CONDITIONS = [
  { v: "", label: "Any condition" },
  { v: "excellent", label: "Excellent" },
  { v: "good", label: "Good" },
  { v: "average", label: "Average" },
  { v: "rough", label: "Rough" },
];
const SORTS = [
  { v: "newest", label: "Newest first" },
  { v: "price_asc", label: "Price: low to high" },
  { v: "price_desc", label: "Price: high to low" },
  { v: "mileage_asc", label: "Lowest mileage" },
  { v: "year_desc", label: "Newest year" },
];

function fmtPrice(cents: number, currency = "CAD") {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 0 }).format((cents || 0) / 100);
}

type V = {
  id: string;
  title: string;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  price_cents: number;
  currency: string;
  mileage_km: number | null;
  city: string | null;
  province: string | null;
  seller_type: string;
  condition?: string | null;
  exterior_color?: string | null;
  dealer?: { id: string; name: string; slug: string } | null;
  vehicle_photos: Array<{ storage_path: string; sort_order: number }>;
};

function BrowsePage() {
  const fetchList = useServerFn(listVehicles);
  const fetchSigned = useServerFn(signVehiclePhotoUrls);
  const [rows, setRows] = useState<V[]>([]);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  const [q, setQ] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [yearMin, setYearMin] = useState("");
  const [priceMin, setPriceMin] = useState("");
  const [priceMax, setPriceMax] = useState("");
  const [mileageMax, setMileageMax] = useState("");
  const [condition, setCondition] = useState("");
  const [body, setBody] = useState("");
  const [sellerType, setSellerType] = useState<"" | "private" | "dealer">("");
  const [city, setCity] = useState("");
  const [sort, setSort] = useState<"newest" | "price_asc" | "price_desc" | "mileage_asc" | "year_desc">("newest");

  const filters = useMemo(() => ({
    q: q || undefined,
    make: make || undefined,
    model: model || undefined,
    year_min: yearMin ? Number(yearMin) : undefined,
    price_min_cents: priceMin ? Number(priceMin) * 100 : undefined,
    price_max_cents: priceMax ? Number(priceMax) * 100 : undefined,
    mileage_max_km: mileageMax ? Number(mileageMax) : undefined,
    condition: (condition || undefined) as any,
    body_type: body || undefined,
    seller_type: sellerType || undefined,
    city: city || undefined,
    sort,
  }), [q, make, model, yearMin, priceMin, priceMax, mileageMax, condition, body, sellerType, city, sort]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchList({ data: filters as any })
      .then(async (data) => {
        if (cancelled) return;
        setRows(data as V[]);
        const paths = (data as V[]).flatMap((r) => r.vehicle_photos.slice().sort((a, b) => a.sort_order - b.sort_order).slice(0, 1).map((p) => p.storage_path));
        if (paths.length > 0) {
          const m = await fetchSigned({ data: { paths } });
          if (!cancelled) setSigned(m as Record<string, string>);
        } else {
          setSigned({});
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [filters, fetchList, fetchSigned]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Browse Vehicles</h1>
          <p className="text-sm text-muted-foreground">Cars, trucks and SUVs from private sellers and dealers across Canada.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground">Sort</label>
          <select
            className="rounded-md border border-border bg-background p-2 text-sm"
            value={sort}
            onChange={(e) => setSort(e.target.value as any)}
          >
            {SORTS.map((s) => <option key={s.v} value={s.v}>{s.label}</option>)}
          </select>
        </div>
      </div>

      <div className="mt-5 grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2 md:grid-cols-4">
        <input className="rounded-md border border-border bg-background p-2 text-sm md:col-span-2" placeholder="Search title, keyword…" value={q} onChange={(e) => setQ(e.target.value)} />
        <input className="rounded-md border border-border bg-background p-2 text-sm" placeholder="Make (e.g. Toyota)" value={make} onChange={(e) => setMake(e.target.value)} />
        <input className="rounded-md border border-border bg-background p-2 text-sm" placeholder="Model" value={model} onChange={(e) => setModel(e.target.value)} />
        <input className="rounded-md border border-border bg-background p-2 text-sm" placeholder="Year (min)" type="number" value={yearMin} onChange={(e) => setYearMin(e.target.value)} />
        <input className="rounded-md border border-border bg-background p-2 text-sm" placeholder="Min price (CAD)" type="number" value={priceMin} onChange={(e) => setPriceMin(e.target.value)} />
        <input className="rounded-md border border-border bg-background p-2 text-sm" placeholder="Max price (CAD)" type="number" value={priceMax} onChange={(e) => setPriceMax(e.target.value)} />
        <input className="rounded-md border border-border bg-background p-2 text-sm" placeholder="Max mileage (km)" type="number" value={mileageMax} onChange={(e) => setMileageMax(e.target.value)} />
        <select className="rounded-md border border-border bg-background p-2 text-sm" value={condition} onChange={(e) => setCondition(e.target.value)}>
          {CONDITIONS.map((c) => <option key={c.v} value={c.v}>{c.label}</option>)}
        </select>
        <select className="rounded-md border border-border bg-background p-2 text-sm" value={body} onChange={(e) => setBody(e.target.value)}>
          <option value="">Any body type</option>
          {BODY_TYPES.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
        <select className="rounded-md border border-border bg-background p-2 text-sm" value={sellerType} onChange={(e) => setSellerType(e.target.value as any)}>
          <option value="">All sellers</option>
          <option value="private">Private</option>
          <option value="dealer">Dealer</option>
        </select>
        <input className="rounded-md border border-border bg-background p-2 text-sm" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
      </div>

      {loading ? (
        <div className="mt-10 text-center text-sm text-muted-foreground">Loading vehicles…</div>
      ) : rows.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No vehicles match your search. <Link to="/vehicles/sell" className="text-primary hover:underline">Be the first to list one</Link>.
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {rows.map((v) => {
            const cover = v.vehicle_photos.slice().sort((a, b) => a.sort_order - b.sort_order)[0];
            const img = cover ? signed[cover.storage_path] : null;
            const heading = [v.year, v.make, v.model].filter(Boolean).join(" ") || v.title;
            const isDealer = v.seller_type === "dealer";
            return (
              <Link key={v.id} to="/vehicles/$id" params={{ id: v.id }} className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card transition hover:border-primary/40">
                <div className="relative aspect-[4/3] overflow-hidden bg-muted">
                  {img ? (
                    <img src={img} alt={heading} loading="lazy" className="h-full w-full object-cover transition group-hover:scale-105" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-muted-foreground"><Car className="h-10 w-10" /></div>
                  )}
                  <span
                    className={
                      "absolute left-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide backdrop-blur " +
                      (isDealer ? "bg-primary/90 text-primary-foreground" : "bg-background/90 text-foreground")
                    }
                  >
                    {isDealer ? <ShieldCheck className="h-3 w-3" /> : <UserIcon className="h-3 w-3" />}
                    {isDealer ? "Dealer" : "Private"}
                  </span>
                </div>
                <div className="p-3">
                  <div className="line-clamp-1 text-sm font-semibold text-foreground">{heading}</div>
                  {v.trim && <div className="line-clamp-1 text-xs text-muted-foreground">{v.trim}</div>}
                  <div className="mt-1 text-base font-bold">{fmtPrice(v.price_cents, v.currency)}</div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                    {v.mileage_km != null && <span className="inline-flex items-center gap-1"><Gauge className="h-3 w-3" />{v.mileage_km.toLocaleString()} km</span>}
                    {v.city && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{v.city}{v.province ? ", " + v.province : ""}</span>}
                  </div>
                  {isDealer && v.dealer && (
                    <div className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-primary">
                      <ShieldCheck className="h-3 w-3" /> Verified Dealer · {v.dealer.name}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
