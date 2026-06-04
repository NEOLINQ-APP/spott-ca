import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getVehicle, signVehiclePhotoUrls } from "@/lib/vehicles.functions";
import { Car, MapPin, Gauge, Fuel, Cog, ArrowLeft, MessageSquare } from "lucide-react";
import { AuthGate } from "@/components/AuthGate";

export const Route = createFileRoute("/vehicles/$id")({
  component: VehicleDetailGated,
  errorComponent: ({ error }) => <div className="p-8 text-sm text-rose-600">Couldn't load this vehicle: {error.message}</div>,
  notFoundComponent: () => <div className="p-8 text-sm text-muted-foreground">Vehicle not found.</div>,
});

function VehicleDetailGated() {
  const { id } = useParams({ from: "/vehicles/$id" });
  return (
    <AuthGate
      redirectTo={`/vehicles/${id}`}
      title="Sign in to view this vehicle"
      description="Create a free account or sign in to see full details, photos, and contact the seller."
      backTo="/vehicles/browse"
      backLabel="← Back to vehicles"
    >
      <VehicleDetail />
    </AuthGate>
  );
}

function fmtPrice(cents: number, currency = "CAD") {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 0 }).format((cents || 0) / 100);
}

function VehicleDetail() {
  const { id } = useParams({ from: "/vehicles/$id" });
  const fetchVehicle = useServerFn(getVehicle);
  const fetchSigned = useServerFn(signVehiclePhotoUrls);
  const [v, setV] = useState<any>(null);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [activeIdx, setActiveIdx] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchVehicle({ data: { id } })
      .then(async (data) => {
        if (cancelled || !data) return setLoading(false);
        setV(data);
        const paths = (data.vehicle_photos ?? []).slice().sort((a: any, b: any) => a.sort_order - b.sort_order).map((p: any) => p.storage_path);
        if (paths.length > 0) {
          const m = await fetchSigned({ data: { paths } });
          if (!cancelled) setSigned(m as Record<string, string>);
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [id, fetchVehicle, fetchSigned]);

  if (loading) return <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>;
  if (!v) return <div className="p-8 text-center text-sm text-muted-foreground">Vehicle not found.</div>;

  const photos = (v.vehicle_photos ?? []).slice().sort((a: any, b: any) => a.sort_order - b.sort_order);
  const active = photos[activeIdx];

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Link to="/vehicles/browse" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to browse
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-muted">
            {active && signed[active.storage_path] ? (
              <img src={signed[active.storage_path]} alt={v.title} className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-muted-foreground"><Car className="h-16 w-16" /></div>
            )}
          </div>
          {photos.length > 1 && (
            <div className="mt-3 grid grid-cols-5 gap-2">
              {photos.map((p: any, i: number) => (
                <button key={p.id} onClick={() => setActiveIdx(i)} className={`relative aspect-square overflow-hidden rounded-md border-2 ${i === activeIdx ? "border-primary" : "border-transparent"}`}>
                  {signed[p.storage_path] && <img src={signed[p.storage_path]} alt="" className="h-full w-full object-cover" />}
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">{v.seller_type}</span>
          <h1 className="mt-2 font-display text-3xl font-semibold">{v.title}</h1>
          <div className="mt-2 text-3xl font-bold text-primary">{fmtPrice(v.price_cents, v.currency)}</div>

          <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-border bg-card p-4 text-sm">
            {v.mileage_km != null && <Spec icon={<Gauge className="h-4 w-4" />} label="Mileage" value={`${v.mileage_km.toLocaleString()} km`} />}
            {v.fuel_type && <Spec icon={<Fuel className="h-4 w-4" />} label="Fuel" value={v.fuel_type} />}
            {v.transmission && <Spec icon={<Cog className="h-4 w-4" />} label="Transmission" value={v.transmission} />}
            {v.drivetrain && <Spec icon={<Cog className="h-4 w-4" />} label="Drivetrain" value={v.drivetrain} />}
            {v.body_type && <Spec icon={<Car className="h-4 w-4" />} label="Body" value={v.body_type} />}
            {v.engine && <Spec icon={<Cog className="h-4 w-4" />} label="Engine" value={v.engine} />}
            {(v.city || v.province) && <Spec icon={<MapPin className="h-4 w-4" />} label="Location" value={[v.city, v.province].filter(Boolean).join(", ")} />}
            {v.condition && <Spec icon={<Car className="h-4 w-4" />} label="Condition" value={v.condition} />}
          </div>

          <Link to="/vehicles/test-drive/$id" params={{ id: v.id }} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground hover:bg-primary/90">
            <MessageSquare className="h-4 w-4" /> Book a test drive
          </Link>
          <p className="mt-2 text-center text-xs text-muted-foreground">Or get a <Link to="/vehicles/cash-offer" className="font-medium text-primary hover:underline">cash offer</Link> · <Link to="/vehicles/trade-in" className="font-medium text-primary hover:underline">trade-in value</Link></p>
        </div>
      </div>

      {v.description && (
        <section className="mt-8 rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Description</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{v.description}</p>
        </section>
      )}

      {Array.isArray(v.features) && v.features.length > 0 && (
        <section className="mt-4 rounded-xl border border-border bg-card p-5">
          <h2 className="font-semibold">Features</h2>
          <ul className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
            {v.features.map((f: string, i: number) => <li key={i} className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />{f}</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}

function Spec({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">{icon}{label}</div>
      <div className="mt-0.5 font-medium">{value}</div>
    </div>
  );
}
