import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, Pencil } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { adminListListings } from "@/lib/admin-content.functions";

export const Route = createFileRoute("/admin/listings")({
  component: AdminListings,
  head: () => ({ meta: [{ title: "Marketplace Listings — Spott Admin" }] }),
});

type Row = {
  id: string;
  title: string;
  price_cents: number | null;
  currency: string | null;
  status: string | null;
  city: string | null;
  province: string | null;
  is_featured: boolean | null;
  created_at: string;
};

function AdminListings() {
  const fetchList = useServerFn(adminListListings);
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
      title="Marketplace Listings"
      description="Every product and service published to the marketplace. Admins can edit any listing."
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
                placeholder="Search by title…"
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
              <option value="sold">Sold</option>
              <option value="inactive">Inactive</option>
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
            <p className="py-8 text-center text-sm text-muted-foreground">No listings found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">Title</th>
                    <th className="py-2 pr-3">Price</th>
                    <th className="py-2 pr-3">Location</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Created</th>
                    <th className="py-2 pr-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-b hover:bg-muted/30">
                      <td className="py-2 pr-3 font-medium">{r.title}</td>
                      <td className="py-2 pr-3">
                        {r.price_cents != null
                          ? `$${(r.price_cents / 100).toLocaleString("en-CA")}`
                          : "—"}
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
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("en-CA")}
                      </td>
                      <td className="py-2 pr-3">
                        <Button asChild variant="outline" size="sm">
                          <Link to="/admin/listings/$id" params={{ id: r.id }}>
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
