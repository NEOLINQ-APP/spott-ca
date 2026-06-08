import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Download, Users, Mail } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  listSubscribers,
  SUBSCRIBER_CATEGORIES,
  CANADIAN_PROVINCES,
  INTEREST_OPTIONS,
} from "@/lib/subscribers.functions";

export const Route = createFileRoute("/admin/subscribers")({
  component: AdminSubscribers,
  head: () => ({ meta: [{ title: "Subscribers — Spott Admin" }] }),
});

type Row = {
  id: string;
  email: string;
  display_name: string | null;
  category: string;
  province: string | null;
  city: string | null;
  interests: string[];
  membership_type: string;
  subscribed: boolean;
  source: string | null;
  created_at: string;
};

function categoryLabel(v: string) {
  return SUBSCRIBER_CATEGORIES.find((c) => c.value === v)?.label ?? v;
}

function AdminSubscribers() {
  const fetchList = useServerFn(listSubscribers);
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [count, setCount] = useState(0);
  const [stats, setStats] = useState({ total: 0, active: 0 });
  const [filters, setFilters] = useState({
    category: "all",
    province: "all",
    city: "",
    interest: "all",
    subscribed_only: true,
  });

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchList({
        data: {
          category: filters.category === "all" ? null : filters.category,
          province: filters.province === "all" ? null : filters.province,
          city: filters.city || null,
          interest: filters.interest === "all" ? null : filters.interest,
          subscribed_only: filters.subscribed_only,
          limit: 200,
          offset: 0,
        },
      });
      setRows(res.rows as Row[]);
      setCount(res.count);
      setStats(res.stats);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [
    filters.category, filters.province, filters.interest, filters.subscribed_only,
  ]);

  const exportCsv = () => {
    const header = ["email","name","category","province","city","interests","membership","subscribed","source","created_at"];
    const lines = [header.join(",")];
    rows.forEach((r) => {
      lines.push([
        r.email,
        r.display_name ?? "",
        r.category,
        r.province ?? "",
        r.city ?? "",
        `"${r.interests.join("; ")}"`,
        r.membership_type,
        r.subscribed ? "yes" : "no",
        r.source ?? "",
        r.created_at,
      ].map((s) => String(s).replace(/[\r\n]/g, " ")).join(","));
    });
    const blob = new Blob([lines.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `spott-subscribers-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const segmentSummary = useMemo(() => {
    const parts: string[] = [];
    if (filters.category !== "all") parts.push(categoryLabel(filters.category));
    if (filters.province !== "all") parts.push(filters.province);
    if (filters.city) parts.push(filters.city);
    if (filters.interest !== "all") parts.push(`interested in ${filters.interest}`);
    return parts.length ? parts.join(" · ") : "All subscribers";
  }, [filters]);

  return (
    <AdminShell
      title="Subscribers"
      description="Newsletter and marketing list — filter by category, province, city, and interests."
      actions={
        <Button onClick={exportCsv} variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" /> Export CSV
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3 mb-6">
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total subscribers</p>
              <p className="text-2xl font-semibold">{stats.total.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-green-100 text-green-700">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Active (subscribed)</p>
              <p className="text-2xl font-semibold">{stats.active.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-5">
            <div className="grid h-10 w-10 place-items-center rounded-md bg-blue-100 text-blue-700">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">In current segment</p>
              <p className="text-2xl font-semibold">{count.toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="mb-4">
        <CardContent className="grid gap-3 p-5 md:grid-cols-5">
          <div>
            <Label className="text-xs">Category</Label>
            <Select value={filters.category} onValueChange={(v) => setFilters({ ...filters, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {SUBSCRIBER_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Province</Label>
            <Select value={filters.province} onValueChange={(v) => setFilters({ ...filters, province: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {CANADIAN_PROVINCES.map((p) => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">City</Label>
            <Input
              value={filters.city}
              onChange={(e) => setFilters({ ...filters, city: e.target.value })}
              onBlur={load}
              placeholder="e.g. Toronto"
            />
          </div>
          <div>
            <Label className="text-xs">Interest</Label>
            <Select value={filters.interest} onValueChange={(v) => setFilters({ ...filters, interest: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {INTEREST_OPTIONS.map((i) => (
                  <SelectItem key={i} value={i}>{i}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Status</Label>
            <Select
              value={filters.subscribed_only ? "active" : "all"}
              onValueChange={(v) => setFilters({ ...filters, subscribed_only: v === "active" })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active only</SelectItem>
                <SelectItem value="all">Include unsubscribed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <div className="mb-3 text-sm text-muted-foreground">
        Segment: <span className="font-medium text-foreground">{segmentSummary}</span> · {count.toLocaleString()} matching
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="grid place-items-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No subscribers match this segment yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Interests</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.email}</TableCell>
                    <TableCell>{r.display_name ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{categoryLabel(r.category)}</Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      {[r.city, r.province].filter(Boolean).join(", ") || "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {r.interests.slice(0, 3).map((i) => (
                          <Badge key={i} variant="outline" className="text-[10px]">{i}</Badge>
                        ))}
                        {r.interests.length > 3 && (
                          <span className="text-xs text-muted-foreground">+{r.interests.length - 3}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {r.subscribed
                        ? <Badge className="bg-green-100 text-green-700">Active</Badge>
                        : <Badge variant="outline">Unsubscribed</Badge>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleDateString("en-CA")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AdminShell>
  );
}
