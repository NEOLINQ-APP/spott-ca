import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/site-header";
import { PartnerShell } from "@/components/partner/PartnerShell";
import { useAuth } from "@/hooks/use-auth";
import { getMySpottAutoPartner, getMySpottAutoLeads } from "@/lib/spott-auto.functions";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/partner/leads")({
  component: PartnerLeads,
  head: () => ({ meta: [{ title: "My Leads — SPOTT Auto" }] }),
});

const STATUS_STYLE: Record<string, string> = {
  submitted: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
  received: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
  under_review: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200",
  contacted: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200",
  dealership_assigned: "bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200",
  appointment_requested: "bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200",
  appointment_set: "bg-violet-100 text-violet-800 dark:bg-violet-950/40 dark:text-violet-200",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-950/40 dark:text-blue-200",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  cancelled: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200",
};

function PartnerLeads() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const getPartner = useServerFn(getMySpottAutoPartner);
  const getLeads = useServerFn(getMySpottAutoLeads);
  const [partner, setPartner] = useState<any>(undefined);
  const [leads, setLeads] = useState<any[]>([]);
  const [busy, setBusy] = useState(true);

  useEffect(() => {
    if (!loading && !user) { navigate({ to: "/auth" }); return; }
    if (!user) return;
    getPartner()
      .then(async (p) => { setPartner(p); if (p) setLeads((await getLeads()) as any[]); })
      .finally(() => setBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  if (loading || busy) return <><SiteHeader /><div className="mx-auto max-w-6xl p-12"><Loader2 className="h-6 w-6 animate-spin" /></div></>;
  if (!partner) return <><SiteHeader /><main className="mx-auto max-w-3xl px-4 py-16 text-center"><h1 className="text-2xl font-bold">You're not a SPOTT Auto partner yet</h1><p className="mt-2 text-muted-foreground">Apply from the Partner Dashboard first.</p></main></>;
  if (partner.status !== "active") return <><SiteHeader /><main className="mx-auto max-w-3xl px-4 py-16 text-center"><h1 className="text-2xl font-bold capitalize">Application {partner.status}</h1></main></>;

  return (
    <PartnerShell displayName={partner.display_name}>
      <header className="mb-6">
        <h1 className="text-2xl font-bold">My Leads</h1>
        <p className="text-sm text-muted-foreground">Financing applications from customers you referred.</p>
      </header>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Date</th>
                <th className="px-4 py-2">Name</th>
                <th className="px-4 py-2">Contact</th>
                <th className="px-4 py-2">Location</th>
                <th className="px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="px-4 py-2 text-xs">{new Date(l.created_at).toLocaleString()}</td>
                  <td className="px-4 py-2 font-medium">{l.full_name}</td>
                  <td className="px-4 py-2 text-xs">
                    <div>{l.email}</div>
                    {l.phone && <div className="text-muted-foreground">{l.phone}</div>}
                  </td>
                  <td className="px-4 py-2 text-xs">{[l.city, l.province].filter(Boolean).join(", ") || "—"}</td>
                  <td className="px-4 py-2">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[l.status] ?? "bg-muted text-muted-foreground"}`}>
                      {l.status.replace(/_/g, " ")}
                    </span>
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  No leads yet. Share your referral link to start driving financing applications.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </PartnerShell>
  );
}
