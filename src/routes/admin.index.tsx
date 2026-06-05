import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Line,
  LineChart,
  Bar,
  BarChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  DollarSign,
  ShoppingBag,
  Users,
  Building2,
  Megaphone,
  TicketPercent,
  Wallet,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAdminDashboard } from "@/lib/admin-dashboard.functions";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
  head: () => ({ meta: [{ title: "Admin Overview — Spott" }] }),
});

type Data = Awaited<ReturnType<typeof getAdminDashboard>>;

function formatCAD(n: number) {
  return n.toLocaleString("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 });
}
function formatNum(n: number) {
  return n.toLocaleString("en-CA");
}
function formatDate(s: string) {
  return new Date(s).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

function Kpi({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: any;
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </span>
          <span className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </span>
        </div>
        <div className="mt-3 text-2xl font-semibold tracking-tight">{value}</div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function AdminOverview() {
  const fetchDash = useServerFn(getAdminDashboard);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchDash({})
      .then((d) => {
        if (!cancelled) setData(d as Data);
      })
      .catch(() => {})
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [fetchDash]);

  return (
    <AdminShell
      title="Overview"
      description="Snapshot of platform performance over the last 30 days."
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/analytics">
            View analytics
            <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      }
    >
      {loading || !data ? (
        <div className="grid place-items-center py-24">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI grid */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 xl:grid-cols-7">
            <Kpi icon={DollarSign} label="Total Revenue" value={formatCAD(data.kpis.totalRevenue)} hint="All paid orders" />
            <Kpi icon={ShoppingBag} label="Total Orders" value={formatNum(data.kpis.totalOrders)} />
            <Kpi icon={Users} label="Active Users" value={formatNum(data.kpis.activeUsers)} />
            <Kpi icon={Building2} label="Active Businesses" value={formatNum(data.kpis.activeBusinesses)} />
            <Kpi icon={Megaphone} label="Total Promoters" value={formatNum(data.kpis.totalPromoters)} />
            <Kpi icon={TicketPercent} label="Promo Code Usage" value={formatNum(data.kpis.promoCodeUsage)} />
            <Kpi icon={Wallet} label="Pending Payouts" value={formatNum(data.kpis.pendingPayouts)} />
          </div>

          {/* Charts */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Revenue (last 30 days)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.series}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tickFormatter={formatDate} fontSize={11} />
                      <YAxis fontSize={11} tickFormatter={(v) => `$${v}`} />
                      <Tooltip
                        formatter={(v: number) => formatCAD(v)}
                        labelFormatter={(l) => formatDate(l as string)}
                      />
                      <Line type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Orders over time</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.series}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tickFormatter={formatDate} fontSize={11} />
                      <YAxis fontSize={11} allowDecimals={false} />
                      <Tooltip labelFormatter={(l) => formatDate(l as string)} />
                      <Bar dataKey="orders" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Lower grid */}
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-base">Top Promoters</CardTitle>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/admin/promoters">View all</Link>
                </Button>
              </CardHeader>
              <CardContent className="px-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Promoter</TableHead>
                      <TableHead className="text-right">Orders</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.topPromoters.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-sm text-muted-foreground">
                          No promoter activity yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.topPromoters.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="text-right">{formatNum(p.orders)}</TableCell>
                          <TableCell className="text-right">{formatCAD(p.revenue)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Recent signups</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.recentSignups.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No new signups.</p>
                ) : (
                  data.recentSignups.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between text-sm">
                      <span className="truncate">{s.display_name ?? "New user"}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(s.created_at)}</span>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent transactions</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link to="/admin/transactions">View all</Link>
              </Button>
            </CardHeader>
            <CardContent className="px-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Promo code</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                        No orders yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    data.recentOrders.map((o: any) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-mono text-xs">{o.id.slice(0, 8)}</TableCell>
                        <TableCell>
                          <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
                            {o.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{o.promoter_code ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDate(o.created_at)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCAD((o.total_cents ?? 0) / 100)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}
    </AdminShell>
  );
}
