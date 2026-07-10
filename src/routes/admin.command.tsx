import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  Loader2,
  ShieldAlert,
  ShieldCheck,
  FileWarning,
  Gavel,
  Flag,
  Car,
  UserCheck,
  Wallet,
  ClipboardList,
  ArrowRight,
} from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getComplianceOverview, listDisclosureAudits } from "@/lib/admin-command.functions";

export const Route = createFileRoute("/admin/command")({
  component: AdminCommand,
  head: () => ({ meta: [{ title: "Command Center — Spott Admin" }] }),
});

type Overview = Awaited<ReturnType<typeof getComplianceOverview>>;
type Audit = { id: string; vehicle_id: string; user_id: string; attestation: any; signed_at: string };

function Tile({
  label,
  value,
  hint,
  tone = "default",
  icon: Icon,
  to,
}: {
  label: string;
  value: number;
  hint?: string;
  tone?: "default" | "warn" | "danger" | "ok";
  icon: any;
  to?: string;
}) {
  const tones = {
    default: "bg-muted text-foreground",
    warn: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-700",
    ok: "bg-emerald-100 text-emerald-700",
  } as const;
  const body = (
    <Card className="h-full transition-colors hover:border-primary/40">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="mt-2 text-2xl font-semibold">{value.toLocaleString("en-CA")}</div>
            {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
          </div>
          <span className={`grid h-9 w-9 place-items-center rounded-md ${tones[tone]}`}>
            <Icon className="h-4 w-4" />
          </span>
        </div>
        {to && (
          <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary">
            Open queue <ArrowRight className="h-3 w-3" />
          </div>
        )}
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{body}</Link> : body;
}

function AdminCommand() {
  const fetchOverview = useServerFn(getComplianceOverview);
  const fetchAudits = useServerFn(listDisclosureAudits);
  const [data, setData] = useState<Overview | null>(null);
  const [audits, setAudits] = useState<Audit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [o, a] = await Promise.all([fetchOverview({}), fetchAudits({ data: { limit: 15 } })]);
        if (cancelled) return;
        setData(o as Overview);
        setAudits((a?.rows as Audit[]) ?? []);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchOverview, fetchAudits]);

  return (
    <AdminShell
      title="Command Center"
      description="Compliance queues, moderation health, and platform integrity signals."
      actions={
        <Button asChild variant="outline" size="sm">
          <Link to="/admin/audit-log">
            <ClipboardList className="mr-1 h-3.5 w-3.5" /> Audit log
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
          {/* Compliance queues */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Compliance queues
            </h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              <Tile
                label="Pending verifications"
                value={data.pendingVerifications}
                hint="Business / dealer / realtor"
                tone={data.pendingVerifications > 0 ? "warn" : "ok"}
                icon={ShieldCheck}
                to="/admin/verifications"
              />
              <Tile
                label="Pending claims"
                value={data.pendingClaims}
                hint={data.staleClaims > 0 ? `${data.staleClaims} > 7 days old` : "All fresh"}
                tone={data.staleClaims > 0 ? "danger" : data.pendingClaims > 0 ? "warn" : "ok"}
                icon={Flag}
              />
              <Tile
                label="Open disputes"
                value={data.openDisputes}
                hint="Marketplace orders"
                tone={data.openDisputes > 0 ? "warn" : "ok"}
                icon={Gavel}
              />
              <Tile
                label="Reported reviews"
                value={data.reportedReviews}
                hint={`${data.hiddenReviews} currently hidden`}
                tone={data.reportedReviews > 0 ? "warn" : "ok"}
                icon={ShieldAlert}
                to="/admin/reviews"
              />
            </div>
          </section>

          {/* Dealer / vehicle compliance */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Vehicle & dealer compliance
            </h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              <Tile
                label="Dealer listings — unverified dealer"
                value={data.unverifiedDealerListings}
                hint="Must link to a verified business"
                tone={data.unverifiedDealerListings > 0 ? "danger" : "ok"}
                icon={FileWarning}
              />
              <Tile
                label="Dealer listings — unsigned disclosures"
                value={data.unsignedDealerListings}
                hint="Prior use, odometer, accidents"
                tone={data.unsignedDealerListings > 0 ? "danger" : "ok"}
                icon={Car}
              />
              <Tile
                label="Disclosures signed (7d)"
                value={data.disclosureAudits7d}
                hint="Attestations logged"
                tone="ok"
                icon={ClipboardList}
              />
            </div>
          </section>

          {/* Promoter operations */}
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Promoter operations
            </h2>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-4">
              <Tile
                label="Promoter applications"
                value={data.pendingPromoters}
                hint="Awaiting approval"
                tone={data.pendingPromoters > 0 ? "warn" : "ok"}
                icon={UserCheck}
                to="/admin/promoters"
              />
              <Tile
                label="Payout requests"
                value={data.pendingPayouts}
                hint="Pending payouts"
                tone={data.pendingPayouts > 0 ? "warn" : "ok"}
                icon={Wallet}
                to="/admin/payouts"
              />
            </div>
          </section>

          {/* Recent disclosure audits */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Recent vehicle disclosure attestations</CardTitle>
              <Badge variant="outline">Immutable log</Badge>
            </CardHeader>
            <CardContent className="px-0">
              {audits.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  No disclosures signed yet.
                </div>
              ) : (
                <div className="divide-y">
                  {audits.map((a) => (
                    <div key={a.id} className="flex items-center justify-between px-6 py-3 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs text-muted-foreground">
                          {a.vehicle_id.slice(0, 8)}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          by {a.user_id.slice(0, 8)}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          {Object.keys(a.attestation ?? {}).length} fields
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(a.signed_at).toLocaleString("en-CA")}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </AdminShell>
  );
}
