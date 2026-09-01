import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  listSpottAutoPartners,
  updateSpottAutoPartnerStatus,
  getSpottAutoPartnerActivity,
} from "@/lib/spott-auto-admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Pause, PlayCircle } from "lucide-react";

export const Route = createFileRoute("/admin/partners")({
  component: AdminPartners,
  head: () => ({ meta: [{ title: "SPOTT Auto Partners — Spott Admin" }] }),
});

type Partner = {
  id: string;
  user_id: string | null;
  display_name: string;
  email: string;
  phone: string | null;
  status: "pending" | "active" | "suspended" | "inactive";
  referral_code: string;
  created_at: string;
};

const FILTERS = ["pending", "active", "suspended", "inactive", "all"] as const;
type Filter = (typeof FILTERS)[number];

function AdminPartners() {
  const list = useServerFn(listSpottAutoPartners);
  const update = useServerFn(updateSpottAutoPartnerStatus);
  const [filter, setFilter] = useState<Filter>("pending");
  const [rows, setRows] = useState<Partner[]>([]);
  const [busy, setBusy] = useState(true);
  const [selected, setSelected] = useState<Partner | null>(null);
  const [q, setQ] = useState("");

  const reload = () => {
    setBusy(true);
    list({ data: { status: filter } })
      .then((r: any) => setRows((r ?? []) as Partner[]))
      .catch((e) => toast.error(e.message ?? "Failed to load"))
      .finally(() => setBusy(false));
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [filter]);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const needle = q.toLowerCase();
    return rows.filter((r) =>
      [r.display_name, r.email, r.referral_code].filter(Boolean).some((v) => v!.toLowerCase().includes(needle)),
    );
  }, [rows, q]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { pending: 0, active: 0, suspended: 0, inactive: 0 };
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  const setStatus = async (id: string, status: Partner["status"]) => {
    try {
      await update({ data: { id, status } });
      toast.success(`Partner ${status}`);
      setSelected(null);
      reload();
    } catch (e: any) {
      toast.error(e.message ?? "Update failed");
    }
  };

  return (
    <AdminShell
      title="SPOTT Auto Partners"
      description="Approve partner applicants and manage the referral program driving vehicle-financing leads to dealerships."
    >
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full border px-3 py-1 text-xs font-medium capitalize transition ${
                filter === f ? "bg-primary text-primary-foreground" : "hover:bg-muted"
              }`}
            >
              {f} {f !== "all" && counts[f] != null && <span className="ml-1 opacity-70">({counts[f]})</span>}
            </button>
          ))}
        </div>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name, email, code…" className="w-64" />
      </div>

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Partner</th>
              <th className="px-4 py-2 font-medium">Contact</th>
              <th className="px-4 py-2 font-medium">Referral code</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Applied</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {busy ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No partners in this bucket.</td></tr>
            ) : filtered.map((p) => (
              <tr key={p.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2 font-medium">{p.display_name}</td>
                <td className="px-4 py-2 text-xs">
                  <div>{p.email}</div>
                  {p.phone && <div className="text-muted-foreground">{p.phone}</div>}
                </td>
                <td className="px-4 py-2 font-mono text-xs">{p.referral_code}</td>
                <td className="px-4 py-2"><StatusBadge status={p.status} /></td>
                <td className="px-4 py-2 text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-2 text-right">
                  <Button size="sm" variant="outline" onClick={() => setSelected(p)}>Review</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ReviewDrawer partner={selected} onClose={() => setSelected(null)} onSetStatus={setStatus} />
    </AdminShell>
  );
}

function StatusBadge({ status }: { status: Partner["status"] }) {
  const map: Record<Partner["status"], string> = {
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
    active: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
    suspended: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200",
    inactive: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
  };
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${map[status]}`}>{status}</span>;
}

function ReviewDrawer({
  partner, onClose, onSetStatus,
}: {
  partner: Partner | null;
  onClose: () => void;
  onSetStatus: (id: string, status: Partner["status"]) => Promise<void>;
}) {
  const getActivity = useServerFn(getSpottAutoPartnerActivity);
  const [activity, setActivity] = useState<{ referrals: any[]; events: any[]; applications: any[] } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!partner) { setActivity(null); return; }
    getActivity({ data: { partner_id: partner.id } }).then(setActivity).catch(() => setActivity(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partner?.id]);

  if (!partner) return null;

  const doAction = async (status: Partner["status"]) => {
    setSaving(true);
    try { await onSetStatus(partner.id, status); } finally { setSaving(false); }
  };

  return (
    <Sheet open={!!partner} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{partner.display_name}</SheetTitle>
          <SheetDescription>
            Applied {new Date(partner.created_at).toLocaleDateString()} · code <span className="font-mono">{partner.referral_code}</span>
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-4">
          <section className="rounded-lg border p-4 text-sm">
            <div className="mb-2 font-medium">Contact</div>
            <div className="grid gap-1 text-muted-foreground">
              <div><span className="font-medium text-foreground">Email:</span> {partner.email}</div>
              {partner.phone && <div><span className="font-medium text-foreground">Phone:</span> {partner.phone}</div>}
            </div>
          </section>

          <section className="grid grid-cols-3 gap-3 text-center">
            <Stat label="Referrals" value={activity?.referrals.length ?? "…"} />
            <Stat label="Applications" value={activity?.applications.length ?? "…"} />
            <Stat label="Tracked events" value={activity?.events.length ?? "…"} />
          </section>

          <div className="flex flex-wrap gap-2 border-t pt-4">
            {partner.status !== "active" && (
              <Button onClick={() => doAction("active")} disabled={saving}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Activate
              </Button>
            )}
            {partner.status !== "suspended" && (
              <Button variant="outline" onClick={() => doAction("suspended")} disabled={saving}>
                <Pause className="mr-2 h-4 w-4" /> Suspend
              </Button>
            )}
            {partner.status === "suspended" && (
              <Button variant="outline" onClick={() => doAction("active")} disabled={saving}>
                <PlayCircle className="mr-2 h-4 w-4" /> Reactivate
              </Button>
            )}
            <Button variant="ghost" className="ml-auto" onClick={onClose}>Close</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-lg font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
