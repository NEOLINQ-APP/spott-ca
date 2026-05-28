import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-roles";
import {
  getAdminOverview,
  listPendingBusinesses,
  moderateBusiness,
  deleteBusinessAsAdmin,
} from "@/lib/admin.functions";
import { toast } from "sonner";
import {
  Loader2,
  Check,
  X,
  Users,
  Building2,
  Star,
  CreditCard,
  ShieldCheck,
  Database,
  ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/admin/")({
  component: AdminHome,
  head: () => ({ meta: [{ title: "Admin — Spott.ca" }] }),
});

type Overview = Awaited<ReturnType<typeof getAdminOverview>>;
type BizRow = Awaited<ReturnType<typeof listPendingBusinesses>>["rows"][number];

function AdminHome() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();

  const fetchOverview = useServerFn(getAdminOverview);
  const fetchListings = useServerFn(listPendingBusinesses);
  const moderate = useServerFn(moderateBusiness);

  const [tab, setTab] = useState<"overview" | "listings">("overview");
  const [listingsStatus, setListingsStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [rows, setRows] = useState<BizRow[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  const refresh = async () => {
    if (!isAdmin) return;
    setLoadingData(true);
    try {
      if (tab === "overview") {
        const ov = await fetchOverview();
        setOverview(ov);
      } else {
        const { rows } = await fetchListings({ data: { status: listingsStatus, limit: 100 } });
        setRows(rows);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, tab, listingsStatus]);

  const onModerate = async (id: string, action: "approve" | "reject") => {
    setBusy(id);
    try {
      await moderate({ data: { id, action } });
      toast.success(action === "approve" ? "Listing approved" : "Listing rejected");
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (e: any) {
      toast.error(e?.message ?? "Action failed");
    } finally {
      setBusy(null);
    }
  };

  if (authLoading || rolesLoading) {
    return <div className="p-10 text-sm text-muted-foreground">Loading…</div>;
  }
  if (!isAdmin) {
    return (
      <>
        <SiteHeader />
        <div className="mx-auto max-w-2xl p-10">
          <h1 className="text-xl font-semibold">Admin only</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You don't have access to this area. If you should, ask an existing admin to grant your role on{" "}
            <Link to="/admin/roles" className="text-primary underline">
              /admin/roles
            </Link>
            .
          </p>
        </div>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Admin</h1>
            <p className="text-sm text-muted-foreground">Platform overview &amp; moderation</p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Link
              to="/admin/ingest"
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 hover:bg-muted"
            >
              <Database className="h-3.5 w-3.5" /> Ingestion <ExternalLink className="h-3 w-3" />
            </Link>
            <Link
              to="/admin/roles"
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 hover:bg-muted"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Roles <ExternalLink className="h-3 w-3" />
            </Link>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 border-b border-border">
          {(["overview", "listings"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? "border-b-2 border-primary text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "listings" ? "Listings moderation" : t}
              {t === "listings" && overview && overview.businesses.pending > 0 && (
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  {overview.businesses.pending}
                </span>
              )}
            </button>
          ))}
        </div>

        {tab === "overview" && (
          <OverviewTab data={overview} loading={loadingData} />
        )}

        {tab === "listings" && (
          <ListingsTab
            rows={rows}
            status={listingsStatus}
            setStatus={setListingsStatus}
            loading={loadingData}
            busy={busy}
            onModerate={onModerate}
          />
        )}
      </div>
    </>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Users;
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-2 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <div className="text-2xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

function OverviewTab({ data, loading }: { data: Overview | null; loading: boolean }) {
  if (loading || !data) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading stats…
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          icon={Users}
          label="Users"
          value={data.users.total}
          hint={`+${data.users.today} today · +${data.users.last7} this week`}
        />
        <StatCard
          icon={Building2}
          label="Listings"
          value={data.businesses.total}
          hint={`${data.businesses.approved} approved · ${data.businesses.pending} pending`}
        />
        <StatCard
          icon={CreditCard}
          label="Active subscriptions"
          value={data.activeSubscriptions}
        />
        <StatCard icon={Star} label="Reviews" value={data.totalReviews} />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 text-sm font-medium">Needs your attention</div>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">Pending listings</span>
              <span className="font-semibold">{data.businesses.pending}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">Pending claims</span>
              <span className="font-semibold">{data.pendingClaims}</span>
            </li>
          </ul>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 text-sm font-medium">Signups</div>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">Today</span>
              <span className="font-semibold">{data.users.today}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">Last 7 days</span>
              <span className="font-semibold">{data.users.last7}</span>
            </li>
            <li className="flex items-center justify-between">
              <span className="text-muted-foreground">Last 30 days</span>
              <span className="font-semibold">{data.users.last30}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function ListingsTab({
  rows,
  status,
  setStatus,
  loading,
  busy,
  onModerate,
}: {
  rows: BizRow[];
  status: "pending" | "approved" | "rejected";
  setStatus: (s: "pending" | "approved" | "rejected") => void;
  loading: boolean;
  busy: string | null;
  onModerate: (id: string, action: "approve" | "reject") => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(["pending", "approved", "rejected"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition-colors ${
              status === s
                ? "bg-primary text-primary-foreground"
                : "border border-border bg-card text-muted-foreground hover:text-foreground"
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
          No {status} listings.
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <div key={r.id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <Link
                      to="/business/$slug"
                      params={{ slug: r.slug }}
                      className="text-base font-semibold hover:underline"
                    >
                      {r.name}
                    </Link>
                    {r.category_name && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                        {r.category_name}
                      </span>
                    )}
                    {r.is_claimed && (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-600">
                        claimed
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {[r.city, r.province].filter(Boolean).join(", ")}
                    {r.address && ` · ${r.address}`}
                  </div>
                  {r.description && (
                    <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{r.description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {r.phone && <span>📞 {r.phone}</span>}
                    {r.email && <span>✉︎ {r.email}</span>}
                    {r.website && (
                      <a href={r.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        🌐 website
                      </a>
                    )}
                  </div>
                </div>
                {status === "pending" && (
                  <div className="flex shrink-0 flex-col gap-2">
                    <button
                      onClick={() => onModerate(r.id, "approve")}
                      disabled={busy === r.id}
                      className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {busy === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                      Approve
                    </button>
                    <button
                      onClick={() => onModerate(r.id, "reject")}
                      disabled={busy === r.id}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50"
                    >
                      <X className="h-3 w-3" /> Reject
                    </button>
                  </div>
                )}
                {status === "rejected" && (
                  <button
                    onClick={() => onModerate(r.id, "approve")}
                    disabled={busy === r.id}
                    className="inline-flex shrink-0 items-center gap-1 rounded-md bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {busy === r.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                    Restore
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
