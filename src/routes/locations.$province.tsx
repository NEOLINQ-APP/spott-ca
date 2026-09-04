import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { findProvinceBySlug } from "@/lib/city-pages";
import { getProvincePageData } from "@/lib/province-pages.functions";
import { Loader2, MapPin, Car, FileText } from "lucide-react";

export const Route = createFileRoute("/locations/$province")({
  component: ProvincePage,
  loader: ({ params }) => {
    const province = findProvinceBySlug(params.province);
    if (!province) throw new Error("Province not found");
    return province;
  },
  head: ({ loaderData }) => {
    const p = loaderData as { name: string; code: string } | undefined;
    if (!p) return { meta: [{ title: "Location — Spott Auto" }] };
    const title = `Vehicle Financing in ${p.name} — Spott Auto`;
    const description = `Browse vehicles and apply for financing with dealership partners in ${p.name}, Canada.`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: `https://www.spott.ca/locations/${p.name.toLowerCase()}` },
      ],
    };
  },
  errorComponent: () => <div className="p-8 text-sm text-muted-foreground">Province not found.</div>,
});

function ProvincePage() {
  const { province: slug } = useParams({ from: "/locations/$province" });
  const province = findProvinceBySlug(slug)!;
  const fetchData = useServerFn(getProvincePageData);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchData({ data: { province: province.code } }).then(setData).catch(() => setData(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [province.code]);

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        <Link to="/locations" className="text-sm text-muted-foreground hover:text-foreground">← All provinces</Link>
        <header className="mt-4 mb-8">
          <h1 className="font-display text-4xl font-semibold tracking-tight">{province.name}</h1>
          <p className="mt-2 text-base text-muted-foreground">Vehicle listings, dealership partners, and financing applications in {province.name}.</p>
        </header>

        {!data ? (
          <Loader2 className="h-6 w-6 animate-spin" />
        ) : (
          <>
            <div className="mb-8 grid grid-cols-3 gap-3">
              <StatCard icon={Car} label="Vehicle listings" value={data.vehicle_count} />
              <StatCard icon={MapPin} label="Businesses" value={data.business_count} />
              <StatCard icon={FileText} label="Financing applications" value={data.financing_leads_count} />
            </div>

            <div className="mb-8 flex flex-wrap gap-3">
              <Link to="/vehicles/browse" className="rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">Browse vehicles</Link>
              <Link to="/vehicles/apply" className="rounded-md border border-border bg-card px-5 py-2.5 text-sm font-semibold hover:bg-muted">Start your application</Link>
            </div>

            {data.cities.length > 0 && (
              <section>
                <h2 className="mb-3 font-display text-xl font-semibold">Cities in {province.name}</h2>
                <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {data.cities.map((c: any) => (
                    <li key={c.slug}>
                      <Link to="/city/$slug" params={{ slug: c.slug }} className="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-accent/10">
                        <span>{c.name}</span>
                        <span className="text-xs text-muted-foreground">{c.business_count}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <Icon className="mb-2 h-5 w-5 text-primary" />
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
