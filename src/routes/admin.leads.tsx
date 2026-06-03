import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listLeadsAdmin, updateLeadAdmin } from "@/lib/leads.functions";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-roles";
import { SiteHeader } from "@/components/site-header";
import { Loader2, ArrowLeft, Mail, Phone, MapPin, Car, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/leads")({
  component: AdminLeadsPage,
  head: () => ({ meta: [{ title: "Vehicle Leads — Admin" }] }),
});

type Lead = Awaited<ReturnType<typeof listLeadsAdmin>>[number];

const TYPE_LABEL: Record<string, string> = {
  test_drive: "Test drive",
  trade_in: "Trade-in",
  cash_offer: "Cash offer",
  contact: "Contact",
};
const STATUSES = ["new", "contacted", "qualified", "closed_won", "closed_lost"] as const;
type Status = typeof STATUSES[number];

function fmtCents(c?: number | null) {
  if (c == null) return "—";
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(c / 100);
}

function AdminLeadsPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();
  const fetchLeads = useServerFn(listLeadsAdmin);
  const updateLead = useServerFn(updateLeadAdmin);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [busy, setBusy] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  async function load() {
    setBusy(true);
    try {
      const data = await fetchLeads({
        data: {
          lead_type: (typeFilter || undefined) as any,
          status: (statusFilter || undefined) as any,
        },
      });
      setLeads(data);
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't load leads");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!authLoading && !rolesLoading && isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, rolesLoading, isAdmin, typeFilter, statusFilter]);

  if (authLoading || rolesLoading) {
    return <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>;
  }
  if (!user || !isAdmin) {
    return (
      <div className="p-8 text-center text-sm text-muted-foreground">
        Admin access required. <Link to="/auth" className="text-primary underline">Sign in</Link>
      </div>
    );
  }

  async function changeStatus(id: string, status: Status) {
    try {
      await updateLead({ data: { id, status } });
      setLeads((cur) => cur.map((l) => (l.id === id ? { ...l, status } : l)));
      toast.success("Updated");
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't update");
    }
  }

  return (
    <>
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-6">
        <Link to="/admin" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to admin
        </Link>
        <h1 className="mt-2 font-display text-3xl font-semibold">Vehicle Leads</h1>
        <p className="text-sm text-muted-foreground">Test drive, trade-in, cash offer and contact requests from the Vehicles platform.</p>

        <div className="mt-4 flex flex-wrap gap-2">
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">All types</option>
            {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-md border border-input bg-background px-3 py-2 text-sm">
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
          </select>
          <button onClick={load} className="rounded-md border border-input bg-background px-3 py-2 text-sm hover:bg-muted">Refresh</button>
        </div>

        {busy ? (
          <div className="mt-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : leads.length === 0 ? (
          <div className="mt-10 text-center text-sm text-muted-foreground">No leads yet.</div>
        ) : (
          <div className="mt-4 grid gap-3">
            {leads.map((l) => (
              <div key={l.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">{TYPE_LABEL[l.lead_type] ?? l.lead_type}</span>
                      <span className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString("en-CA")}</span>
                    </div>
                    <div className="mt-1 font-semibold">{l.full_name}</div>
                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" />{l.email}</span>
                      {l.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{l.phone}</span>}
                      {(l.city || l.province) && <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" />{[l.city, l.province].filter(Boolean).join(", ")}</span>}
                    </div>
                  </div>
                  <select
                    value={l.status}
                    onChange={(e) => changeStatus(l.id, e.target.value as Status)}
                    className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                  >
                    {STATUSES.map((s) => <option key={s} value={s}>{s.replace("_", " ")}</option>)}
                  </select>
                </div>

                {(l.year || l.make || l.model || l.vehicle_id) && (
                  <div className="mt-3 flex flex-wrap items-center gap-3 rounded-md bg-muted/40 px-3 py-2 text-xs">
                    <Car className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {[l.year, l.make, l.model, l.trim].filter(Boolean).join(" ") || "—"}
                      {l.mileage_km != null && <> · {l.mileage_km.toLocaleString()} km</>}
                      {l.condition && <> · {l.condition}</>}
                    </span>
                    {l.vehicle_id && (
                      <Link to="/vehicles/$id" params={{ id: l.vehicle_id }} className="ml-auto text-primary hover:underline">View listing →</Link>
                    )}
                  </div>
                )}

                {(l.preferred_date || l.preferred_time) && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Preferred: {l.preferred_date ?? "—"} {l.preferred_time ?? ""}
                  </div>
                )}

                {(l.ai_estimate_low_cents != null || l.ai_estimate_high_cents != null) && (
                  <div className="mt-3 rounded-md border border-primary/20 bg-primary/5 px-3 py-2 text-xs">
                    <div className="flex items-center gap-1 font-semibold text-primary"><Sparkles className="h-3 w-3" /> AI estimate {fmtCents(l.ai_estimate_low_cents)} – {fmtCents(l.ai_estimate_high_cents)}</div>
                    {l.ai_notes && <div className="mt-1 text-muted-foreground">{l.ai_notes}</div>}
                  </div>
                )}

                {l.message && (
                  <p className="mt-3 whitespace-pre-wrap rounded-md bg-muted/30 px-3 py-2 text-sm">{l.message}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
