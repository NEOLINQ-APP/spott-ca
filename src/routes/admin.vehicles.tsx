import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, Pencil } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminListVehicles } from "@/lib/admin-content.functions";

export const Route = createFileRoute("/admin/vehicles")({
  component: AdminVehicles,
  head: () => ({ meta: [{ title: "Vehicles — Spott Admin" }] }),
});

type Row = {
  id: string;
  seller_type: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  trim: string | null;
  price_cents: number | null;
  mileage_km: number | null;
  status: string | null;
  city: string | null;
  province: string | null;
  is_featured: boolean | null;
  created_at: string;
};

function AdminVehicles() {
  const fetchList = useServerFn(adminListVehicles);
  const [rows, setRows] = useState<Row[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  async function load() {
    setLoading(true);
    try {
      const r = await fetchList({ data: { search, status: status || undefined, limit: 100 } });
      setRows((r?.rows as Row[]) ?? []);
      setCount(r?.count ?? 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <AdminShell
      title="Vehicles"
      description="All vehicle listings — private, dealer, and AI-generated. Admins can edit any listing."
    >
      <Card>
        <CardContent className="p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              load();
            }}
            className="mb-4 flex flex-wrap items-center gap-2"
          >
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search title, make, model, VIN…"
                className="pl-9"
              />
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-10 rounded-md border bg-background px-2 text-sm"
            >
              <option value="">All statuses</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="featured">Featured</option>
              <option value="sold">Sold</option>
              <option value="pending_review">Pending review</option>
            </select>
            <Button type="submit" size="sm">
              Filter
            </Button>
            <span className="ml-auto text-xs text-muted-foreground">{count} total</span>
          </form>

          {loading ? (
            <div className="grid place-items-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No vehicles found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">Vehicle</th>
                    <th className="py-2 pr-3">Price</th>
                    <th className="py-2 pr-3">Km</th>
                    <th className="py-2 pr-3">Seller</th>
                    <th className="py-2 pr-3">Location</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b hover:bg-muted/30">
                      <td className="py-2 pr-3 font-medium">
                        {[r.year, r.make, r.model, r.trim].filter(Boolean).join(" ") || "—"}
                      </td>
                      <td className="py-2 pr-3">
                        {r.price_cents != null
                          ? `$${(r.price_cents / 100).toLocaleString("en-CA")}`
                          : "—"}
                      </td>
                      <td className="py-2 pr-3">
                        {r.mileage_km != null ? `${r.mileage_km.toLocaleString("en-CA")} km` : "—"}
                      </td>
                      <td className="py-2 pr-3">
                        <Badge variant="outline">{r.seller_type ?? "—"}</Badge>
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {[r.city, r.province].filter(Boolean).join(", ")}
                      </td>
                      <td className="py-2 pr-3">
                        <Badge variant={r.status === "active" ? "default" : "secondary"}>
                          {r.status ?? "—"}
                        </Badge>
                        {r.is_featured && (
                          <Badge className="ml-1" variant="outline">
                            Featured
                          </Badge>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <Button asChild variant="outline" size="sm">
                          <Link to="/admin/vehicles/$id" params={{ id: r.id }}>
                            <Pencil className="mr-1 h-3 w-3" /> Edit
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminShell>
  );
}
