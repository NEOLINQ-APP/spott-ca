import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listDealerVehicles } from "@/lib/dealer.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Plus, Star, Flame } from "lucide-react";

export const Route = createFileRoute("/dealer/vehicles")({ component: DealerVehiclesPage });

function fmtPrice(cents: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(
    cents / 100,
  );
}

function DealerVehiclesPage() {
  const fetchFn = useServerFn(listDealerVehicles);
  const { data, isLoading } = useQuery({
    queryKey: ["dealer-vehicles"],
    queryFn: () => fetchFn(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading inventory…
      </div>
    );
  }

  const vehicles = data?.vehicles ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Inventory ({vehicles.length})</h2>
        <Link to="/vehicles/sell"><Button size="sm"><Plus className="h-4 w-4 mr-1"/> Add vehicle</Button></Link>
      </div>

      {vehicles.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No vehicles yet. Add your first inventory listing to start receiving leads.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="text-left px-4 py-2">Vehicle</th>
                  <th className="text-left px-4 py-2">Price</th>
                  <th className="text-left px-4 py-2">Status</th>
                  <th className="text-left px-4 py-2">Views</th>
                  <th className="text-left px-4 py-2">Boost</th>
                  <th className="text-right px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {vehicles.map((v: any) => (
                  <tr key={v.id}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{v.title ?? [v.year, v.make, v.model].filter(Boolean).join(" ")}</div>
                      <div className="text-xs text-muted-foreground">
                        {[v.city, v.province].filter(Boolean).join(", ")}{v.mileage_km ? ` · ${v.mileage_km.toLocaleString()} km` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">{fmtPrice(v.price_cents)}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="capitalize">{v.status}</Badge></td>
                    <td className="px-4 py-3">{v.view_count}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {v.is_featured && <Badge className="gap-1"><Star className="h-3 w-3"/>Featured</Badge>}
                        {v.is_boosted && <Badge variant="secondary" className="gap-1"><Flame className="h-3 w-3"/>Boost</Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link to="/vehicles/$id" params={{ id: v.id }}>
                        <Button size="sm" variant="outline">View</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
