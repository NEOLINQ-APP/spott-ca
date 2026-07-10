import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listPromoters, updatePromoter } from "@/lib/promoters.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, Pause, Copy, Check } from "lucide-react";

export const Route = createFileRoute("/admin/promoters")({
  component: AdminPromoters,
  head: () => ({ meta: [{ title: "Promoters — Spott Admin" }] }),
});

type Promoter = {
  id: string;
  user_id: string;
  display_name: string;
  company_name: string | null;
  email: string;
  phone: string | null;
  website: string | null;
  social_handle: string | null;
  pitch: string | null;
  commission_type: string | null;
  commission_value: number | null;
  customer_discount_pct: number | null;
  promo_code_str: string | null;
  status: "pending" | "approved" | "suspended" | "rejected";
  notes: string | null;
  approved_at: string | null;
  created_at: string;
};

const FILTERS = ["pending", "approved", "suspended", "rejected", "all"] as const;
type Filter = (typeof FILTERS)[number];

function AdminPromoters() {
  const list = useServerFn(listPromoters);
  const update = useServerFn(updatePromoter);
  const [filter, setFilter] = useState<Filter>("pending");
  const [rows, setRows] = useState<Promoter[]>([]);
  const [busy, setBusy] = useState(true);
  const [selected, setSelected] = useState<Promoter | null>(null);
  const [q, setQ] = useState("");

  const reload = () => {
    setBusy(true);
    // "rejected" isn't in the server enum; treat as client-side filter over all
    const status = filter === "rejected" ? "all" : filter;
    list({ data: { status } as any })
      .then((r: any) => {
        const all = (r ?? []) as Promoter[];
        setRows(filter === "rejected" ? all.filter((p) => p.status === "rejected") : all);
      })
      .catch((e) => toast.error(e.message ?? "Failed to load"))
      .finally(() => setBusy(false));
  };

  useEffect(() => { reload(); /* eslint-disable-next-line */ }, [filter]);

  const filtered = useMemo(() => {
    if (!q.trim()) return rows;
    const needle = q.toLowerCase();
    return rows.filter((r) =>
      [r.display_name, r.company_name, r.email, r.promo_code_str]
        .filter(Boolean).some((v) => (v as string).toLowerCase().includes(needle))
    );
  }, [rows, q]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { pending: 0, approved: 0, suspended: 0, rejected: 0 };
    for (const r of rows) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [rows]);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Promoter review queue</h1>
          <p className="text-sm text-muted-foreground">
            Approve applicants, set commission (10–30%) and customer discount (25–50%). Codes are auto-generated on approval and restricted to subscription &amp; featured add-on invoices.
          </p>
        </div>
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name, company, email, code…"
          className="w-64"
        />
      </header>

      <div className="mb-4 flex flex-wrap gap-2">
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

      <div className="overflow-hidden rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Promoter</th>
              <th className="px-4 py-2 font-medium">Contact</th>
              <th className="px-4 py-2 font-medium">Code</th>
              <th className="px-4 py-2 font-medium">Commission</th>
              <th className="px-4 py-2 font-medium">Discount</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Applied</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {busy ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-muted-foreground">No promoters in this bucket.</td></tr>
            ) : filtered.map((p) => (
              <tr key={p.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2">
                  <div className="font-medium">{p.display_name}</div>
                  {p.company_name && <div className="text-xs text-muted-foreground">{p.company_name}</div>}
                </td>
                <td className="px-4 py-2 text-xs">
                  <div>{p.email}</div>
                  {p.phone && <div className="text-muted-foreground">{p.phone}</div>}
                </td>
                <td className="px-4 py-2 font-mono text-xs">{p.promo_code_str ?? <span className="text-muted-foreground">—</span>}</td>
                <td className="px-4 py-2">{p.commission_value != null ? `${p.commission_value}%` : "—"}</td>
                <td className="px-4 py-2">{p.customer_discount_pct != null ? `${p.customer_discount_pct}%` : "—"}</td>
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

      <ReviewDrawer
        promoter={selected}
        onClose={() => setSelected(null)}
        onSave={async (patch) => {
          try {
            const res: any = await update({ data: patch as any });
            if (res?.generated_code) toast.success(`Approved — code ${res.generated_code} generated.`);
            else toast.success("Updated.");
            setSelected(null);
            reload();
          } catch (e: any) {
            toast.error(e.message ?? "Update failed");
          }
        }}
      />
    </main>
  );
}

function StatusBadge({ status }: { status: Promoter["status"] }) {
  const map: Record<Promoter["status"], string> = {
    pending: "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
    approved: "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
    suspended: "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
    rejected: "bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-200",
  };
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ${map[status]}`}>{status}</span>;
}

function ReviewDrawer({
  promoter, onClose, onSave,
}: {
  promoter: Promoter | null;
  onClose: () => void;
  onSave: (patch: {
    id: string;
    status?: Promoter["status"];
    commission_type?: "percent" | "flat";
    commission_value?: number;
    customer_discount_pct?: number;
    notes?: string | null;
  }) => Promise<void>;
}) {
  const [commission, setCommission] = useState<number>(15);
  const [discount, setDiscount] = useState<number>(25);
  const [notes, setNotes] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (promoter) {
      setCommission(Math.min(30, Math.max(10, promoter.commission_value ?? 15)));
      setDiscount(Math.min(50, Math.max(25, promoter.customer_discount_pct ?? 25)));
      setNotes(promoter.notes ?? "");
    }
  }, [promoter]);

  if (!promoter) return null;

  const doAction = async (status: Promoter["status"]) => {
    setSaving(true);
    try {
      await onSave({
        id: promoter.id,
        status,
        commission_type: "percent",
        commission_value: commission,
        customer_discount_pct: discount,
        notes: notes || null,
      });
    } finally { setSaving(false); }
  };

  return (
    <Sheet open={!!promoter} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{promoter.display_name}</SheetTitle>
          <SheetDescription>
            {promoter.company_name ?? "Independent promoter"} · Applied {new Date(promoter.created_at).toLocaleDateString()}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-4">
          <section className="rounded-lg border p-4 text-sm">
            <div className="mb-2 font-medium">Contact</div>
            <div className="grid gap-1 text-muted-foreground">
              <div><span className="font-medium text-foreground">Email:</span> {promoter.email}</div>
              {promoter.phone && <div><span className="font-medium text-foreground">Phone:</span> {promoter.phone}</div>}
              {promoter.website && <div><span className="font-medium text-foreground">Website:</span> <a href={promoter.website} target="_blank" rel="noreferrer" className="text-primary underline">{promoter.website}</a></div>}
              {promoter.social_handle && <div><span className="font-medium text-foreground">Social:</span> {promoter.social_handle}</div>}
            </div>
          </section>

          {promoter.pitch && (
            <section className="rounded-lg border p-4 text-sm">
              <div className="mb-2 font-medium">Pitch</div>
              <p className="whitespace-pre-wrap text-muted-foreground">{promoter.pitch}</p>
            </section>
          )}

          {promoter.promo_code_str && (
            <section className="rounded-lg border p-4">
              <Label className="mb-2 flex items-center gap-2">Assigned code <Badge variant="secondary">Live</Badge></Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 rounded bg-muted px-3 py-2 font-mono text-sm">{promoter.promo_code_str}</code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(promoter.promo_code_str!);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Restricted to subscription invoices and featured add-ons. P2P listing purchases will reject this code.
              </p>
            </section>
          )}

          <section className="space-y-4 rounded-lg border p-4">
            <div>
              <Label className="mb-2 flex items-center justify-between">
                <span>Commission to promoter</span>
                <span className="font-mono text-sm text-primary">{commission}%</span>
              </Label>
              <Slider min={10} max={30} step={1} value={[commission]} onValueChange={(v) => setCommission(v[0])} />
              <p className="mt-1 text-xs text-muted-foreground">Range: 10–30% of net revenue on each redemption.</p>
            </div>

            <div>
              <Label className="mb-2 flex items-center justify-between">
                <span>Customer discount</span>
                <span className="font-mono text-sm text-primary">{discount}%</span>
              </Label>
              <Slider min={25} max={50} step={5} value={[discount]} onValueChange={(v) => setDiscount(v[0])} />
              <p className="mt-1 text-xs text-muted-foreground">Range: 25–50% off the customer's subscription or featured add-on.</p>
            </div>
          </section>

          <section>
            <Label htmlFor="notes" className="mb-2 block">Internal notes</Label>
            <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Only visible to admins" />
          </section>

          <div className="flex flex-wrap gap-2 border-t pt-4">
            {promoter.status !== "approved" && (
              <Button onClick={() => doAction("approved")} disabled={saving}>
                <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
              </Button>
            )}
            {promoter.status !== "rejected" && (
              <Button variant="outline" onClick={() => doAction("rejected")} disabled={saving}>
                <XCircle className="mr-2 h-4 w-4" /> Reject
              </Button>
            )}
            {promoter.status !== "suspended" && (
              <Button variant="outline" onClick={() => doAction("suspended")} disabled={saving}>
                <Pause className="mr-2 h-4 w-4" /> Suspend
              </Button>
            )}
            <Button variant="ghost" className="ml-auto" onClick={onClose}>Close</Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
