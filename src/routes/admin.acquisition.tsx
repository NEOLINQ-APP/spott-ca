import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Loader2, Building2, Mail, MousePointerClick, CheckCircle2, Clock, ShieldOff, MapPin } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { getAcquisitionOverview } from "@/lib/acquisition-admin.functions";

export const Route = createFileRoute("/admin/acquisition")({
  component: AcquisitionPage,
  head: () => ({ meta: [{ title: "Spott Acquisition — Admin" }] }),
});

function Tile({ label, value, hint, icon: Icon }: { label: string; value: string | number; hint?: string; icon: any }) {
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-1 text-2xl font-bold">{value}</p>
            {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
          </div>
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
      </CardContent>
    </Card>
  );
}

function AcquisitionPage() {
  const fetchOverview = useServerFn(getAcquisitionOverview);
  const [data, setData] = useState<Awaited<ReturnType<typeof getAcquisitionOverview>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setData(await fetchOverview());
      } catch (e) {
        setErr((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchOverview]);

  return (
    <AdminShell title="Spott Acquisition" description="Business claim-invitation campaign performance and funnel status.">
      {loading || !data ? (
        <div className="grid place-items-center py-24"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
      ) : err ? (
        <p className="text-sm text-destructive">{err}</p>
      ) : (
        <div className="space-y-8">
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Business claim funnel</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              <Tile label="Total businesses" value={data.businesses.total} icon={Building2} />
              <Tile label="Unclaimed" value={data.businesses.unclaimed} icon={Building2} />
              <Tile label="Invited" value={data.businesses.invited} icon={Mail} />
              <Tile label="Claimed" value={data.businesses.claimed} icon={CheckCircle2} />
              <Tile label="Verified" value={data.businesses.verified} icon={ShieldOff} />
              <Tile label="Suspended" value={data.businesses.suspended} icon={ShieldOff} />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Campaign performance</h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
              <Tile label="Invitations sent" value={data.campaign.sent} icon={Mail} />
              <Tile label="Opened" value={data.campaign.opened} hint={`${data.campaign.openRate}% open rate`} icon={MousePointerClick} />
              <Tile label="Claim started" value={data.campaign.claimStarted} icon={Clock} />
              <Tile label="Claimed" value={data.campaign.claimed} hint={`${data.campaign.claimRate}% claim rate`} icon={CheckCircle2} />
              <Tile label="Expired" value={data.campaign.expired} icon={Clock} />
              <Tile label="Suppressed emails" value={data.suppressed} icon={ShieldOff} />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">Top cities by listing volume</h2>
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="px-4 py-2 text-left">City</th>
                    <th className="px-4 py-2 text-right">Total</th>
                    <th className="px-4 py-2 text-right">Claimed</th>
                    <th className="px-4 py-2 text-right">Claim rate</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topCities.map((c) => (
                    <tr key={c.city} className="border-t border-border">
                      <td className="px-4 py-2"><span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5 text-muted-foreground" /> {c.city}</span></td>
                      <td className="px-4 py-2 text-right">{c.total}</td>
                      <td className="px-4 py-2 text-right">{c.claimed}</td>
                      <td className="px-4 py-2 text-right">{c.rate}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </AdminShell>
  );
}
