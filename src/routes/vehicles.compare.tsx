import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { getVehicle, signVehiclePhotoUrls } from "@/lib/vehicles.functions";
import { removeCompare } from "@/lib/vehicle-compare";
import { ArrowLeft, Car, X } from "lucide-react";

const search = z.object({ ids: fallback(z.string(), "").default("") });

export const Route = createFileRoute("/vehicles/compare")({
  component: ComparePage,
  validateSearch: zodValidator(search),
  head: () => ({
    meta: [
      { title: "Compare Vehicles — Spott" },
      { name: "description", content: "Compare up to 3 vehicles side by side: price, mileage, fuel, transmission and more." },
    ],
  }),
});

function fmtPrice(cents: number, currency = "CAD") {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency, maximumFractionDigits: 0 }).format((cents || 0) / 100);
}

function ComparePage() {
  const { ids: idsParam } = Route.useSearch();
  const ids = idsParam.split(",").map((s: string) => s.trim()).filter(Boolean).slice(0, 3);
  const fetchVehicle = useServerFn(getVehicle);
  const fetchSigned = useServerFn(signVehiclePhotoUrls);
  const [vs, setVs] = useState<any[]>([]);
  const [signed, setSigned] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (ids.length === 0) { setLoading(false); return; }
    Promise.all(ids.map((id: string) => fetchVehicle({ data: { id } }).catch(() => null)))
      .then(async (results) => {
        if (cancelled) return;
        const rows = results.filter(Boolean);
        setVs(rows);
        const paths = rows.flatMap((v: any) =>
          (v.vehicle_photos ?? []).slice().sort((a: any, b: any) => a.sort_order - b.sort_order).slice(0, 1).map((p: any) => p.storage_path),
        );
        if (paths.length > 0) {
          const m = await fetchSigned({ data: { paths } });
          if (!cancelled) setSigned(m as Record<string, string>);
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, [idsParam]);

  if (ids.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 text-center">
        <h1 className="font-display text-2xl font-semibold">Nothing to compare yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">Add up to 3 vehicles from the browse page using the “Compare” button on each card.</p>
        <Link to="/vehicles/browse" className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
          <ArrowLeft className="h-4 w-4" /> Back to browse
        </Link>
      </div>
    );
  }

  if (loading) return <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>;

  const rows: Array<[string, (v: any) => string]> = [
    ["Price", (v) => fmtPrice(v.price_cents, v.currency)],
    ["Year", (v) => v.year ?? "—"],
    ["Make", (v) => v.make ?? "—"],
    ["Model", (v) => v.model ?? "—"],
    ["Trim", (v) => v.trim ?? "—"],
    ["Mileage", (v) => (v.mileage_km != null ? `${v.mileage_km.toLocaleString()} km` : "—")],
    ["Body", (v) => v.body_type ?? "—"],
    ["Fuel", (v) => v.fuel_type ?? "—"],
    ["Transmission", (v) => v.transmission ?? "—"],
    ["Drivetrain", (v) => v.drivetrain ?? "—"],
    ["Engine", (v) => v.engine ?? "—"],
    ["Condition", (v) => v.condition ?? "—"],
    ["Exterior", (v) => v.exterior_color ?? "—"],
    ["Doors / Seats", (v) => `${v.doors ?? "—"} / ${v.seats ?? "—"}`],
    ["Location", (v) => [v.city, v.province].filter(Boolean).join(", ") || "—"],
    ["Seller", (v) => (v.seller_type === "dealer" ? (v.dealer?.name ?? "Dealer") : "Private")],
  ];

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <Link to="/vehicles/browse" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to browse
      </Link>
      <h1 className="mt-3 font-display text-3xl font-semibold">Side-by-side comparison</h1>
      <p className="mt-1 text-sm text-muted-foreground">Comparing {vs.length} vehicle{vs.length === 1 ? "" : "s"}.</p>

      <div className="mt-6 overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-background w-40 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Spec</th>
              {vs.map((v) => {
                const cover = (v.vehicle_photos ?? []).slice().sort((a: any, b: any) => a.sort_order - b.sort_order)[0];
                const img = cover ? signed[cover.storage_path] : null;
                return (
                  <th key={v.id} className="min-w-[220px] p-2 align-top text-left">
                    <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
                      {img ? <img src={img} alt={v.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-muted-foreground"><Car className="h-10 w-10" /></div>}
                      <button
                        type="button"
                        onClick={() => { removeCompare(v.id); setVs((arr) => arr.filter((x) => x.id !== v.id)); }}
                        className="absolute right-1 top-1 rounded-full bg-background/90 p-1 shadow hover:bg-destructive/10"
                        title="Remove from compare"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <Link
                      to="/vehicles/$id"
                      params={{ id: v.id }}
                      className="mt-2 line-clamp-2 block text-sm font-semibold text-foreground hover:text-primary"
                    >
                      {[v.year, v.make, v.model].filter(Boolean).join(" ") || v.title}
                    </Link>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, get], i) => (
              <tr key={label} className={i % 2 ? "bg-muted/30" : ""}>
                <td className="sticky left-0 bg-inherit px-2 py-2 text-xs font-medium text-muted-foreground">{label}</td>
                {vs.map((v) => (
                  <td key={v.id} className="px-2 py-2 text-sm">{get(v)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
