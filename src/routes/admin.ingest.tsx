import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { SiteHeader } from "@/components/site-header";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-roles";
import {
  listImportSources,
  listStaged,
  ingestStats,
  runImportSource,
  enrichPendingBatch,
  reviewStaged,
} from "@/lib/ingest/ingest.functions";
import { toast } from "sonner";
import { Loader2, Play, Sparkles, Check, X } from "lucide-react";

export const Route = createFileRoute("/admin/ingest")({
  component: AdminIngest,
  head: () => ({ meta: [{ title: "Admin · Ingestion — Spott.ca" }] }),
});

function AdminIngest() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();

  const runSrc = useServerFn(runImportSource);
  const enrich = useServerFn(enrichPendingBatch);
  const review = useServerFn(reviewStaged);
  const fetchSources = useServerFn(listImportSources);
  const fetchStaged = useServerFn(listStaged);
  const fetchStats = useServerFn(ingestStats);

  const [sources, setSources] = useState<any[]>([]);
  const [rows, setRows] = useState<any[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [tab, setTab] = useState<"approved" | "pending" | "promoted" | "duplicate" | "rejected">(
    "approved",
  );

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  const refresh = async () => {
    const [s, st, ct] = await Promise.all([fetchSources(), fetchStaged({ data: { status: tab, limit: 100 } }), fetchStats()]);
    setSources(s.sources);
    setRows(st.rows);
    setCounts(ct.counts);
  };

  useEffect(() => {
    if (isAdmin) refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, tab]);

  if (authLoading || rolesLoading) return <div className="p-10 text-sm text-muted-foreground">Loading…</div>;
  if (!isAdmin)
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <div className="mx-auto max-w-2xl p-10 text-center">
          <h1 className="font-display text-2xl">Admin only</h1>
          <p className="mt-2 text-sm text-muted-foreground">You need the admin role to view this page.</p>
          <Link to="/" className="mt-4 inline-block text-sm text-primary underline">Back home</Link>
        </div>
      </div>
    );

  const doRun = async (id: string) => {
    setBusy(id);
    try {
      const r = await runSrc({ data: { sourceId: id } });
      if (r.error) {
        toast.error(r.error);
        return;
      }
      toast.success(`Fetched ${r.fetched}, staged ${r.staged}, inserted ${r.inserted}`);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const doEnrich = async (limit = 10, categorySlug: string | null = null) => {
    setBusy("enrich");
    try {
      const r = await enrich({ data: { limit, categorySlug } });
      toast.success(`Processed ${r.processed}, auto-approved ${r.autoApproved}`);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const doDrain = async (categorySlug: string | null = null) => {
    setBusy("drain");
    let total = 0;
    let promoted = 0;
    try {
      // up to 10 batches of 200 = 2,000 per click; safe under serverless timeouts
      for (let i = 0; i < 10; i++) {
        const r = await enrich({ data: { limit: 200, categorySlug } });
        total += r.processed;
        promoted += r.autoApproved;
        if (r.processed === 0) break;
      }
      toast.success(`Drained ${total} (auto-approved ${promoted}). Click again to continue if more remain.`);
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const act = async (id: string, action: "promote" | "reject") => {
    setBusy(id);
    try {
      await review({ data: { id, action } });
      toast.success(action === "promote" ? "Promoted" : "Rejected");
      await refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-semibold">Business Ingestion</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          OpenStreetMap + Google Places · AI enrichment · auto-approve when confidence ≥ 0.8
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {(["pending", "approved", "promoted", "duplicate", "rejected"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`rounded-lg border p-3 text-left ${tab === k ? "border-primary bg-primary/10" : "border-border"}`}
            >
              <div className="text-xs uppercase text-muted-foreground">{k}</div>
              <div className="font-display text-2xl">{counts[k] ?? 0}</div>
            </button>
          ))}
        </div>

        {/* Cost panel */}
        {(() => {
          const COST_PER = 0.00015; // ~USD per AI enrichment call (Gemini Flash Lite)
          const pendingN = counts.pending ?? 0;
          const doneN = (counts.promoted ?? 0) + (counts.approved ?? 0) + (counts.rejected ?? 0);
          const estLeft = pendingN * COST_PER;
          const spent = doneN * COST_PER;
          const fmt = (n: number) =>
            n < 0.01 ? `$${n.toFixed(4)}` : n < 1 ? `$${n.toFixed(3)}` : `$${n.toFixed(2)}`;
          return (
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="text-xs uppercase text-muted-foreground">AI spent so far</div>
                <div className="font-display text-2xl">{fmt(spent)}</div>
                <div className="text-xs text-muted-foreground">{doneN.toLocaleString()} listings enriched</div>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="text-xs uppercase text-muted-foreground">Est. cost to drain queue</div>
                <div className="font-display text-2xl">{fmt(estLeft)}</div>
                <div className="text-xs text-muted-foreground">{pendingN.toLocaleString()} pending · ~{fmt(COST_PER)}/listing</div>
              </div>
              <div className="rounded-lg border border-border bg-card p-3">
                <div className="text-xs uppercase text-muted-foreground">Model</div>
                <div className="font-display text-base">Gemini 2.5 Flash Lite</div>
                <div className="text-xs text-muted-foreground">Fallback: Gemini 2.5 Flash</div>
              </div>
            </div>
          );
        })()}

        <section className="mt-8">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-xl">Sources</h2>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => doEnrich(10)}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50"
              >
                {busy === "enrich" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Enrich 10
              </button>
              <button
                onClick={() => doDrain("restaurants-food")}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm disabled:opacity-50"
              >
                {busy === "drain" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Drain restaurants (×200)
              </button>
              <button
                onClick={() => doDrain(null)}
                disabled={busy !== null}
                className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
              >
                {busy === "drain" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                Drain all (×200)
              </button>
            </div>
          </div>
          <div className="mt-3 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-card text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-2">Source</th>
                  <th className="p-2">City</th>
                  <th className="p-2">Prov</th>
                  <th className="p-2">Category</th>
                  <th className="p-2">Filter / Query</th>
                  <th className="p-2">Last run</th>
                  <th className="p-2">Last #</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="p-2 text-xs uppercase">{s.source}</td>
                    <td className="p-2">{s.city}</td>
                    <td className="p-2">{s.province}</td>
                    <td className="p-2">{s.category_slug}</td>
                    <td className="p-2 font-mono text-xs">{s.query ?? s.osm_filter}</td>
                    <td className="p-2 text-xs">{s.last_run_at ? new Date(s.last_run_at).toLocaleString() : "—"}</td>
                    <td className="p-2">{s.last_imported_count ?? 0}</td>
                    <td className="p-2 text-right">
                      <button
                        onClick={() => doRun(s.id)}
                        disabled={busy === s.id}
                        className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs disabled:opacity-50"
                      >
                        {busy === s.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                        Run
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mt-8">
          <h2 className="font-display text-xl capitalize">Queue · {tab}</h2>
          <div className="mt-3 overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-card text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="p-2">Name</th>
                  <th className="p-2">City</th>
                  <th className="p-2">Category</th>
                  <th className="p-2">Conf</th>
                  <th className="p-2">Phone</th>
                  <th className="p-2">Web</th>
                  <th className="p-2">Reason</th>
                  <th className="p-2"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="border-t border-border align-top">
                    <td className="p-2">
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">{r.ai_description ?? r.address}</div>
                    </td>
                    <td className="p-2 text-xs">{r.city}</td>
                    <td className="p-2 text-xs">{r.category_slug}</td>
                    <td className="p-2 text-xs">{r.confidence != null ? Number(r.confidence).toFixed(2) : "—"}</td>
                    <td className="p-2 text-xs">{r.phone ?? "—"}</td>
                    <td className="p-2 text-xs">{r.website ? "✓" : "—"}</td>
                    <td className="p-2 text-xs">{r.dedup_reason ?? ""}</td>
                    <td className="p-2 text-right">
                      {tab === "approved" && (
                        <div className="inline-flex gap-1">
                          <button
                            onClick={() => act(r.id, "promote")}
                            disabled={busy === r.id}
                            className="inline-flex items-center gap-1 rounded bg-primary px-2 py-1 text-xs text-primary-foreground disabled:opacity-50"
                          >
                            <Check className="h-3 w-3" /> Publish
                          </button>
                          <button
                            onClick={() => act(r.id, "reject")}
                            disabled={busy === r.id}
                            className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 text-xs"
                          >
                            <X className="h-3 w-3" /> Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-sm text-muted-foreground">
                      Nothing in this queue.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="mt-8 text-xs text-muted-foreground">
          Data © OpenStreetMap contributors · ODbL.
        </p>
      </div>
    </div>
  );
}
