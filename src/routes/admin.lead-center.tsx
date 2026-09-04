import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  listLeads,
  getLeadDetail,
  assignLead,
  addLeadNote,
  updateLeadStatus,
  retryBarioSync,
  searchDealerBusinesses,
  getLeadCenterAnalytics,
} from "@/lib/lead-center-admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { toast } from "sonner";
import { Loader2, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/admin/lead-center")({
  component: AdminLeadCenter,
  head: () => ({ meta: [{ title: "Lead Center — Spott Admin" }] }),
});

const STATUSES = [
  "submitted", "received", "under_review", "contacted", "dealership_assigned",
  "appointment_requested", "appointment_set", "in_progress", "completed", "cancelled",
];
const PAGE_SIZE = 25;

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

const SYNC_STYLE: Record<string, string> = {
  pending: "text-muted-foreground",
  syncing: "text-blue-600 dark:text-blue-400",
  synced: "text-emerald-600 dark:text-emerald-400",
  retrying: "text-amber-600 dark:text-amber-400",
  failed: "text-rose-600 dark:text-rose-400",
};

function AdminLeadCenter() {
  const list = useServerFn(listLeads);
  const getAnalytics = useServerFn(getLeadCenterAnalytics);

  const [rows, setRows] = useState<any[]>([]);
  const [count, setCount] = useState(0);
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [syncStatus, setSyncStatus] = useState("");
  const [province, setProvince] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);

  const reload = () => {
    setBusy(true);
    list({
      data: {
        search: search || undefined,
        status: status || undefined,
        sync_status: syncStatus || undefined,
        province: province || undefined,
        limit: PAGE_SIZE,
        offset,
      },
    })
      .then((r: any) => { setRows(r.rows); setCount(r.count); })
      .catch((e) => toast.error(e.message ?? "Failed to load"))
      .finally(() => setBusy(false));
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [offset, status, syncStatus, province]);
  useEffect(() => { getAnalytics().then(setAnalytics).catch(() => {}); }, [getAnalytics]);

  const onSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    reload();
  };

  return (
    <AdminShell title="SPOTT Lead Center" description="Search, filter, assign, and track every financing lead through to Bario One sync.">
      {analytics && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          <Stat label="Total" value={analytics.total_applications} />
          <Stat label="Today" value={analytics.applications_today} />
          <Stat label="This week" value={analytics.applications_this_week} />
          <Stat label="This month" value={analytics.applications_this_month} />
          <Stat label="Bario sync rate" value={analytics.bario_sync_success_rate != null ? `${analytics.bario_sync_success_rate}%` : "—"} />
          <Stat label="Bario failures" value={analytics.bario_sync_failures} accent={analytics.bario_sync_failures > 0 ? "rose" : undefined} />
        </div>
      )}

      <form onSubmit={onSearchSubmit} className="mb-4 flex flex-wrap items-center gap-2">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, code…" className="w-64" />
        <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={status} onChange={(e) => { setStatus(e.target.value); setOffset(0); }}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
        </select>
        <select className="h-10 rounded-md border border-input bg-background px-3 text-sm" value={syncStatus} onChange={(e) => { setSyncStatus(e.target.value); setOffset(0); }}>
          <option value="">All sync statuses</option>
          {["pending", "syncing", "synced", "retrying", "failed"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <Input value={province} onChange={(e) => { setProvince(e.target.value); setOffset(0); }} placeholder="Province" className="w-28" />
        <Button type="submit" variant="outline">Search</Button>
      </form>

      <div className="overflow-hidden rounded-lg border">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">Code</th>
                <th className="px-4 py-2 font-medium">Customer</th>
                <th className="px-4 py-2 font-medium">Location</th>
                <th className="px-4 py-2 font-medium">Vehicle</th>
                <th className="px-4 py-2 font-medium">Source</th>
                <th className="px-4 py-2 font-medium">Status</th>
                <th className="px-4 py-2 font-medium">Sync</th>
                <th className="px-4 py-2 font-medium">Date</th>
              </tr>
            </thead>
            <tbody>
              {busy ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No leads found.</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="cursor-pointer border-t hover:bg-muted/30" onClick={() => setSelectedId(r.id)}>
                  <td className="px-4 py-2 font-mono text-xs">{r.application_code}</td>
                  <td className="px-4 py-2">
                    <div className="font-medium">{r.full_name}</div>
                    <div className="text-xs text-muted-foreground">{r.email}</div>
                  </td>
                  <td className="px-4 py-2 text-xs">{[r.city, r.province].filter(Boolean).join(", ")}</td>
                  <td className="px-4 py-2 text-xs">{r.vehicle_interest ? [r.vehicle_interest.year, r.vehicle_interest.make, r.vehicle_interest.model].filter(Boolean).join(" ") || "—" : "—"}</td>
                  <td className="px-4 py-2 text-xs capitalize">{r.lead_source ?? "—"}</td>
                  <td className="px-4 py-2"><span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${STATUS_STYLE[r.status] ?? "bg-muted"}`}>{r.status.replace(/_/g, " ")}</span></td>
                  <td className={`px-4 py-2 text-xs font-medium ${SYNC_STYLE[r.bario_sync_records?.status] ?? "text-muted-foreground"}`}>{r.bario_sync_records?.status ?? "—"}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
        <span>{count} total</span>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={offset === 0} onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}>
            <ChevronLeft className="h-4 w-4" /> Prev
          </Button>
          <Button size="sm" variant="outline" disabled={offset + PAGE_SIZE >= count} onClick={() => setOffset((o) => o + PAGE_SIZE)}>
            Next <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <LeadDetailDrawer id={selectedId} onClose={() => setSelectedId(null)} onChanged={reload} />
    </AdminShell>
  );
}

function Stat({ label, value, accent }: { label: string; value: number | string; accent?: "rose" }) {
  return (
    <div className="rounded-lg border p-3">
      <div className={`text-lg font-bold ${accent === "rose" ? "text-rose-600 dark:text-rose-400" : ""}`}>{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function LeadDetailDrawer({ id, onClose, onChanged }: { id: string | null; onClose: () => void; onChanged: () => void }) {
  const getDetail = useServerFn(getLeadDetail);
  const doAssign = useServerFn(assignLead);
  const doAddNote = useServerFn(addLeadNote);
  const doUpdateStatus = useServerFn(updateLeadStatus);
  const doRetry = useServerFn(retryBarioSync);
  const searchBiz = useServerFn(searchDealerBusinesses);

  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState("");
  const [bizQuery, setBizQuery] = useState("");
  const [bizResults, setBizResults] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  const load = () => {
    if (!id) return;
    setLoading(true);
    getDetail({ data: { id } }).then(setDetail).catch((e) => toast.error(e.message ?? "Failed to load")).finally(() => setLoading(false));
  };
  useEffect(() => { load(); setNote(""); setBizQuery(""); setBizResults([]); /* eslint-disable-next-line */ }, [id]);

  useEffect(() => {
    if (!bizQuery.trim()) { setBizResults([]); return; }
    const t = setTimeout(() => {
      searchBiz({ data: { q: bizQuery } }).then((r: any) => setBizResults(r)).catch(() => {});
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bizQuery]);

  if (!id) return null;

  const assign = async (businessId: string) => {
    setSaving(true);
    try {
      await doAssign({ data: { id, dealer_business_id: businessId } });
      toast.success("Dealership assigned");
      load(); onChanged();
    } catch (e: any) { toast.error(e.message ?? "Failed"); } finally { setSaving(false); }
  };

  const addNote = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await doAddNote({ data: { id, note: note.trim() } });
      toast.success("Note added");
      setNote(""); load();
    } catch (e: any) { toast.error(e.message ?? "Failed"); } finally { setSaving(false); }
  };

  const changeStatus = async (newStatus: string) => {
    setSaving(true);
    try {
      await doUpdateStatus({ data: { id, status: newStatus as any } });
      toast.success("Status updated");
      load(); onChanged();
    } catch (e: any) { toast.error(e.message ?? "Failed"); } finally { setSaving(false); }
  };

  const retry = async () => {
    setSaving(true);
    try {
      await doRetry({ data: { id } });
      toast.success("Bario sync retry queued");
      load();
    } catch (e: any) { toast.error(e.message ?? "Failed"); } finally { setSaving(false); }
  };

  const app = detail?.application;

  return (
    <Sheet open={!!id} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
        {loading || !detail ? (
          <div className="p-8"><Loader2 className="h-5 w-5 animate-spin" /></div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle className="font-mono">{app.application_code}</SheetTitle>
              <SheetDescription>{app.full_name} · Applied {new Date(app.created_at).toLocaleString()}</SheetDescription>
            </SheetHeader>

            <div className="space-y-6 py-4">
              <section className="rounded-lg border p-4 text-sm">
                <div className="mb-2 font-medium">Contact</div>
                <div className="grid gap-1 text-muted-foreground">
                  <div>{app.email} · {app.phone}</div>
                  <div>{[app.city, app.province, app.postal_code].filter(Boolean).join(", ")}</div>
                  <div>Preference: <span className="capitalize">{app.contact_preference ?? "—"}</span></div>
                  <div>Source: <span className="capitalize">{app.lead_source ?? "—"}</span>{app.spott_auto_partners ? ` (partner: ${app.spott_auto_partners.display_name})` : ""}</div>
                </div>
              </section>

              {detail.vehicle_interest && (
                <section className="rounded-lg border p-4 text-sm">
                  <div className="mb-2 font-medium">Vehicle interest</div>
                  <p className="text-muted-foreground">
                    {detail.vehicle_interest.not_sure_yet ? "Not sure yet" : [detail.vehicle_interest.year, detail.vehicle_interest.make, detail.vehicle_interest.model].filter(Boolean).join(" ") || "—"}
                    {detail.vehicle_interest.budget_cents ? ` · Budget $${(detail.vehicle_interest.budget_cents / 100).toLocaleString()}` : ""}
                  </p>
                </section>
              )}

              {detail.financing_details && (
                <section className="rounded-lg border p-4 text-sm">
                  <div className="mb-2 font-medium">Financing details</div>
                  <div className="grid gap-1 text-muted-foreground">
                    <div>{detail.financing_details.employment_status ?? "—"}{detail.financing_details.employer ? ` at ${detail.financing_details.employer}` : ""}</div>
                    {detail.financing_details.income_cents != null && <div>Income: ${(detail.financing_details.income_cents / 100).toLocaleString()}</div>}
                    <div>Housing: {detail.financing_details.housing_status ?? "—"}</div>
                  </div>
                </section>
              )}

              <section className="rounded-lg border p-4">
                <div className="mb-2 text-sm font-medium">Status</div>
                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm capitalize" value={app.status} onChange={(e) => changeStatus(e.target.value)} disabled={saving}>
                  {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                </select>
              </section>

              <section className="rounded-lg border p-4">
                <div className="mb-2 flex items-center justify-between text-sm font-medium">
                  <span>Bario One sync</span>
                  <span className={SYNC_STYLE[detail.sync_record?.status] ?? "text-muted-foreground"}>{detail.sync_record?.status ?? "not queued"}</span>
                </div>
                {detail.sync_record?.last_error && <p className="mb-2 text-xs text-rose-600 dark:text-rose-400">{detail.sync_record.last_error}</p>}
                <Button size="sm" variant="outline" onClick={retry} disabled={saving}><RefreshCw className="mr-1 h-3.5 w-3.5" /> Retry sync</Button>
              </section>

              <section className="rounded-lg border p-4">
                <div className="mb-2 text-sm font-medium">Assign dealership</div>
                <div className="mb-1 text-xs text-muted-foreground">Current: {app.businesses?.name ?? "Unassigned"}</div>
                <Input value={bizQuery} onChange={(e) => setBizQuery(e.target.value)} placeholder="Search businesses…" />
                {bizResults.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {bizResults.map((b) => (
                      <button key={b.id} onClick={() => assign(b.id)} className="block w-full rounded-md border border-border px-3 py-1.5 text-left text-xs hover:bg-muted">
                        {b.name} {b.city ? `— ${b.city}, ${b.province}` : ""}
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-lg border p-4">
                <div className="mb-2 text-sm font-medium">Add internal note</div>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="Only visible to admins" />
                <Button size="sm" className="mt-2" onClick={addNote} disabled={saving || !note.trim()}>Add note</Button>
              </section>

              <section className="rounded-lg border p-4">
                <div className="mb-3 text-sm font-medium">Activity timeline</div>
                <div className="space-y-3">
                  {detail.activities.map((a: any) => (
                    <div key={a.id} className="text-xs">
                      <div className="text-muted-foreground">{new Date(a.created_at).toLocaleString()}{a.is_internal ? " · internal" : ""}</div>
                      <div>{a.description}</div>
                    </div>
                  ))}
                  {detail.activities.length === 0 && <div className="text-xs text-muted-foreground">No activity yet.</div>}
                </div>
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
