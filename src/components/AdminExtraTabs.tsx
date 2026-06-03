import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import {
  listMarketplaceListingsForAdmin,
  moderateMarketplaceListing,
  listVerificationRequests,
  reviewVerification,
  listAllOrders,
  listAllDisputes,
  resolveDispute,
  listUsersAdmin,
  getPlatformMetrics,
} from "@/lib/admin-extra.functions";
import {
  Loader2,
  Trash2,
  Check,
  X,
  ShieldCheck,
  DollarSign,
  TrendingUp,
  ShoppingBag,
  Users,
  AlertTriangle,
  Megaphone,
  Tag,
  Search,
} from "lucide-react";
import { toast } from "sonner";

function fmt(cents: number, currency = "CAD") {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(cents / 100);
}

export function AdminPlatformMetrics() {
  const fetchMetrics = useServerFn(getPlatformMetrics);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMetrics()
      .then(setData)
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading || !data) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading platform metrics…
      </div>
    );
  }

  const cards = [
    { label: "GMV (paid orders)", value: fmt(data.gmvCents), icon: DollarSign },
    { label: "Ad / addon revenue", value: fmt(data.adRevenueCents), icon: TrendingUp },
    { label: "Active businesses", value: data.activeBusinesses, icon: ShieldCheck },
    { label: "Active listings", value: data.activeListings, icon: Tag },
    { label: "Active promoters", value: `${data.promoters.active}`, icon: Megaphone, hint: `+${data.promoters.pending} pending` },
    { label: "Orders today", value: data.ordersToday, icon: ShoppingBag, hint: `${data.paidOrdersTotal} total paid` },
    { label: "Pending verifications", value: data.pendingVerifications, icon: Users },
    { label: "Open disputes", value: data.pendingDisputes, icon: AlertTriangle },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <c.icon className="h-3.5 w-3.5" /> {c.label}
            </div>
            <div className="text-2xl font-semibold">{c.value}</div>
            {c.hint && <div className="mt-1 text-xs text-muted-foreground">{c.hint}</div>}
          </div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 text-sm font-medium">Top marketplace categories</div>
          {data.topCategories.length === 0 ? (
            <div className="text-xs text-muted-foreground">No active listings yet.</div>
          ) : (
            <ul className="space-y-2 text-sm">
              {data.topCategories.map((c: any) => (
                <li key={c.name} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{c.name}</span>
                  <span className="font-semibold">{c.count}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-5">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-rose-600">
            <AlertTriangle className="h-4 w-4" /> Fraud / risk signals
          </div>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">Claims pending &gt; 7 days</span>
              <span className="font-semibold">{data.fraudAlerts.staleClaims}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">Disputes open &gt; 3 days</span>
              <span className="font-semibold">{data.fraudAlerts.staleDisputes}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">High-value listings (≥ $10k)</span>
              <span className="font-semibold">{data.fraudAlerts.highValueListings}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export function AdminMarketplaceTab() {
  const fetchListings = useServerFn(listMarketplaceListingsForAdmin);
  const moderate = useServerFn(moderateMarketplaceListing);
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState<"active" | "sold" | "removed" | "all">("active");
  const [search, setSearch] = useState("");
  const [searchIn, setSearchIn] = useState("");
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetchListings({ data: { status, search: search || undefined } });
      setRows(r.rows);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, search]);

  const act = async (id: string, action: "remove" | "restore" | "delete") => {
    setBusy(id);
    try {
      await moderate({ data: { id, action } });
      toast.success(action === "delete" ? "Listing deleted" : `Listing ${action}d`);
      setRows((p) => (action === "delete" ? p.filter((r) => r.id !== id) : p.map((r) => (r.id === id ? { ...r, status: action === "remove" ? "removed" : "active" } : r))));
    } catch (e: any) {
      toast.error(e?.message ?? "Action failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {(["active", "sold", "removed", "all"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
              status === s ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {s}
          </button>
        ))}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setSearch(searchIn.trim());
          }}
          className="ml-auto flex items-center gap-2"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              value={searchIn}
              onChange={(e) => setSearchIn(e.target.value)}
              placeholder="Search title…"
              className="h-8 w-64 rounded-md border border-border bg-card pl-7 pr-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        </form>
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No listings.
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
              <div className="min-w-0 flex-1">
                <div className="font-medium">{r.title}</div>
                <div className="text-xs text-muted-foreground">
                  {fmt(r.price_cents, r.currency)} · {r.city ?? "—"}, {r.province ?? "—"} · {r.view_count ?? 0} views ·{" "}
                  <span className="capitalize">{r.status}</span>
                </div>
              </div>
              <div className="flex shrink-0 gap-2">
                {r.status !== "removed" ? (
                  <button
                    onClick={() => act(r.id, "remove")}
                    disabled={busy === r.id}
                    className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                  >
                    Remove
                  </button>
                ) : (
                  <button
                    onClick={() => act(r.id, "restore")}
                    disabled={busy === r.id}
                    className="rounded-md border border-border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
                  >
                    Restore
                  </button>
                )}
                <button
                  onClick={() => {
                    if (!confirm("Permanently delete this listing?")) return;
                    act(r.id, "delete");
                  }}
                  disabled={busy === r.id}
                  className="inline-flex items-center gap-1 rounded-md bg-rose-600 px-2 py-1 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
                >
                  <Trash2 className="h-3 w-3" /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminVerificationsTab() {
  const fetchVerifs = useServerFn(listVerificationRequests);
  const review = useServerFn(reviewVerification);
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    const r = await fetchVerifs({ data: { status } });
    setRows(r.rows);
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const act = async (id: string, action: "approve" | "reject") => {
    setBusy(id);
    try {
      await review({ data: { id, action, notes: notes[id] } });
      toast.success(`Verification ${action}d`);
      setRows((p) => p.filter((r) => r.id !== id));
    } catch (e: any) {
      toast.error(e?.message ?? "Action failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["pending", "approved", "rejected", "all"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
              status === s ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No {status === "all" ? "" : status} verification requests.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <div className="font-semibold">{r.business_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {r.business_type} · {r.contact_email} · {[r.city, r.province].filter(Boolean).join(", ")}
                  </div>
                  {r.legal_name && <div className="text-xs text-muted-foreground">Legal: {r.legal_name}</div>}
                  {r.tax_number && <div className="text-xs text-muted-foreground">Tax #: {r.tax_number}</div>}
                  {(r.document_paths?.length ?? 0) > 0 && (
                    <div className="mt-2 text-xs">
                      <span className="font-medium">Documents:</span>{" "}
                      <span className="text-muted-foreground">{r.document_paths.length} attached</span>
                    </div>
                  )}
                </div>
                <span
                  className={`h-fit rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                    r.status === "approved"
                      ? "bg-emerald-500/15 text-emerald-600"
                      : r.status === "pending"
                      ? "bg-amber-500/15 text-amber-600"
                      : "bg-rose-500/15 text-rose-600"
                  }`}
                >
                  {r.status}
                </span>
              </div>
              {r.status === "pending" && (
                <div className="mt-3 space-y-2">
                  <textarea
                    rows={2}
                    placeholder="Optional internal notes…"
                    value={notes[r.id] ?? ""}
                    onChange={(e) => setNotes((p) => ({ ...p, [r.id]: e.target.value }))}
                    className="w-full rounded-md border border-border bg-background p-2 text-xs"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => act(r.id, "approve")}
                      disabled={busy === r.id}
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      <Check className="h-3 w-3" /> Approve
                    </button>
                    <button
                      onClick={() => act(r.id, "reject")}
                      disabled={busy === r.id}
                      className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
                    >
                      <X className="h-3 w-3" /> Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function AdminOrdersTab() {
  const fetchOrders = useServerFn(listAllOrders);
  const [rows, setRows] = useState<any[]>([]);
  const [status, setStatus] = useState<"all" | "pending" | "paid" | "fulfilled" | "disputed" | "refunded">("all");
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetchOrders({ data: { status } });
      setRows(r.orders);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["all", "pending", "paid", "fulfilled", "disputed", "refunded"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize ${
              status === s ? "bg-primary text-primary-foreground" : "border border-border bg-card text-muted-foreground hover:text-foreground"
            }`}
          >
            {s}
          </button>
        ))}
      </div>
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          No orders.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left">Order</th>
                <th className="px-3 py-2 text-left">Buyer</th>
                <th className="px-3 py-2 text-left">Status</th>
                <th className="px-3 py-2 text-right">Total</th>
                <th className="px-3 py-2 text-right">Commission</th>
                <th className="px-3 py-2 text-left">Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="border-t border-border">
                  <td className="px-3 py-2 font-mono text-xs">{o.id.slice(0, 8)}</td>
                  <td className="px-3 py-2 font-mono text-xs">{o.buyer_id.slice(0, 8)}</td>
                  <td className="px-3 py-2 capitalize">{o.status}</td>
                  <td className="px-3 py-2 text-right">{fmt(o.total_cents, o.currency)}</td>
                  <td className="px-3 py-2 text-right">{fmt(o.commission_cents, o.currency)}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{new Date(o.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function AdminDisputesTab() {
  const fetchDisputes = useServerFn(listAllDisputes);
  const resolve = useServerFn(resolveDispute);
  const [rows, setRows] = useState<any[]>([]);
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const r = await fetchDisputes();
    setRows(r.disputes);
  };
  useEffect(() => {
    load();
  }, []);

  const act = async (id: string, status: "resolved" | "rejected") => {
    const resolution = notes[id]?.trim();
    if (!resolution) {
      toast.error("Add a short resolution note");
      return;
    }
    setBusy(id);
    try {
      await resolve({ data: { id, status, resolution } });
      toast.success(`Dispute ${status}`);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(null);
    }
  };

  if (rows.length === 0)
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
        No disputes.
      </div>
    );

  return (
    <div className="space-y-3">
      {rows.map((d) => (
        <div key={d.id} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex flex-wrap justify-between gap-2">
            <div>
              <div className="font-semibold">{d.reason}</div>
              <div className="text-xs text-muted-foreground">
                Order {d.order_id.slice(0, 8)} · opened {new Date(d.created_at).toLocaleString()}
              </div>
              {d.details && <p className="mt-2 text-sm text-muted-foreground">{d.details}</p>}
              {d.resolution && (
                <p className="mt-2 text-xs">
                  <span className="font-medium">Resolution:</span> {d.resolution}
                </p>
              )}
            </div>
            <span
              className={`h-fit rounded-full px-2 py-0.5 text-[10px] font-medium capitalize ${
                d.status === "open"
                  ? "bg-amber-500/15 text-amber-600"
                  : d.status === "resolved"
                  ? "bg-emerald-500/15 text-emerald-600"
                  : "bg-rose-500/15 text-rose-600"
              }`}
            >
              {d.status}
            </span>
          </div>
          {d.status === "open" && (
            <div className="mt-3 space-y-2">
              <textarea
                rows={2}
                placeholder="Resolution note (visible to buyer & seller)…"
                value={notes[d.id] ?? ""}
                onChange={(e) => setNotes((p) => ({ ...p, [d.id]: e.target.value }))}
                className="w-full rounded-md border border-border bg-background p-2 text-xs"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => act(d.id, "resolved")}
                  disabled={busy === d.id}
                  className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  Resolve (refund buyer)
                </button>
                <button
                  onClick={() => act(d.id, "rejected")}
                  disabled={busy === d.id}
                  className="rounded-md border border-border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
                >
                  Reject dispute
                </button>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export function AdminUsersTab() {
  const fetchUsers = useServerFn(listUsersAdmin);
  const [rows, setRows] = useState<any[]>([]);
  const [searchIn, setSearchIn] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchUsers({ data: { search: search || undefined } }).then((r) => setRows(r.users));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  return (
    <div className="space-y-4">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setSearch(searchIn.trim());
        }}
        className="flex items-center gap-2"
      >
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={searchIn}
            onChange={(e) => setSearchIn(e.target.value)}
            placeholder="Search by display name…"
            className="h-8 w-72 rounded-md border border-border bg-card pl-7 pr-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>
      </form>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">User</th>
              <th className="px-3 py-2 text-left">Roles</th>
              <th className="px-3 py-2 text-left">Joined</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-3 py-2">
                  <div className="font-medium">{u.display_name || "—"}</div>
                  <div className="font-mono text-xs text-muted-foreground">{u.id.slice(0, 8)}</div>
                </td>
                <td className="px-3 py-2">
                  {u.roles.length === 0 ? (
                    <span className="text-xs text-muted-foreground">customer</span>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {u.roles.map((r: string) => (
                        <span key={r} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium">
                          {r}
                        </span>
                      ))}
                    </div>
                  )}
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AdminPlansTab() {
  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <h3 className="text-lg font-semibold">Subscription plans</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        Plans &amp; add-ons are configured in your payments dashboard. Use the public pricing page to preview what
        customers see.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <a
          href="/pricing"
          target="_blank"
          rel="noreferrer"
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          Open public pricing page
        </a>
      </div>
    </div>
  );
}
