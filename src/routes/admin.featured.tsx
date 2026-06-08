import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Sparkles, Search, Check, X } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Tabs, TabsList, TabsTrigger, TabsContent,
} from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  FEATURED_SECTIONS,
  FEATURED_TIERS,
  adminListFeatureRequests,
  adminReviewFeatureRequest,
  adminSetBusinessFeatured,
  adminSearchBusinessesForFeatured,
} from "@/lib/featured.functions";

export const Route = createFileRoute("/admin/featured")({
  component: AdminFeatured,
  head: () => ({ meta: [{ title: "Featured Businesses — Spott Admin" }] }),
});

type ReqRow = {
  id: string;
  business_id: string;
  requested_tier: string;
  requested_sections: string[];
  message: string | null;
  status: string;
  admin_notes: string | null;
  created_at: string;
  businesses?: { name: string; slug: string; city: string | null; province: string | null; business_type: string | null; hero_image_url: string | null } | null;
};

type BizRow = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  province: string | null;
  business_type: string | null;
  featured_until: string | null;
  featured_priority: number;
  featured_tier: string | null;
  featured_sections: string[];
};

function AdminFeatured() {
  return (
    <AdminShell
      title="Featured Businesses"
      description="Approve applications, set placement tiers, sections, ranking and expiry."
    >
      <Tabs defaultValue="requests" className="w-full">
        <TabsList>
          <TabsTrigger value="requests">Applications</TabsTrigger>
          <TabsTrigger value="manage">Manage placements</TabsTrigger>
        </TabsList>
        <TabsContent value="requests" className="mt-4">
          <ApplicationsTab />
        </TabsContent>
        <TabsContent value="manage" className="mt-4">
          <ManageTab />
        </TabsContent>
      </Tabs>
    </AdminShell>
  );
}

function ApplicationsTab() {
  const list = useServerFn(adminListFeatureRequests);
  const review = useServerFn(adminReviewFeatureRequest);
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [rows, setRows] = useState<ReqRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await list({ data: { status } });
      setRows(res.rows as ReqRow[]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  const act = async (id: string, action: "approve" | "reject") => {
    try {
      await review({ data: { id, action, notes: notes[id] || undefined } });
      toast.success(action === "approve" ? "Approved" : "Rejected");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Action failed");
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4">
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={load}>Refresh</Button>
        </div>
        {loading ? (
          <div className="grid place-items-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">
            No {status === "all" ? "" : status} feature applications.
          </div>
        ) : (
          <div className="divide-y">
            {rows.map((r) => (
              <div key={r.id} className="grid gap-3 p-4 md:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="font-semibold">{r.businesses?.name ?? "—"}</div>
                    {r.status === "pending" && <Badge className="bg-amber-100 text-amber-700">Pending</Badge>}
                    {r.status === "approved" && <Badge className="bg-emerald-100 text-emerald-700">Approved</Badge>}
                    {r.status === "rejected" && <Badge variant="outline">Rejected</Badge>}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {[r.businesses?.city, r.businesses?.province].filter(Boolean).join(", ") || "—"} · {r.businesses?.business_type ?? "business"}
                  </div>
                  <div className="mt-2 text-sm">
                    Tier: <span className="font-medium">{r.requested_tier}</span> · Sections: {r.requested_sections.join(", ")}
                  </div>
                  {r.message && <p className="mt-2 text-sm text-foreground/80">"{r.message}"</p>}
                  {r.status === "pending" && (
                    <Textarea
                      rows={2}
                      className="mt-3"
                      placeholder="Admin notes (optional, shown to applicant)"
                      value={notes[r.id] ?? ""}
                      onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                    />
                  )}
                </div>
                {r.status === "pending" && (
                  <div className="flex flex-col gap-2 md:items-end">
                    <Button size="sm" onClick={() => act(r.id, "approve")} className="bg-emerald-600 hover:bg-emerald-700">
                      <Check className="mr-1 h-4 w-4" /> Approve
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => act(r.id, "reject")}>
                      <X className="mr-1 h-4 w-4" /> Reject
                    </Button>
                    <p className="text-[11px] text-muted-foreground md:text-right">
                      Approval is just a decision — set placement in the "Manage" tab.
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ManageTab() {
  const search = useServerFn(adminSearchBusinessesForFeatured);
  const setFeatured = useServerFn(adminSetBusinessFeatured);
  const [q, setQ] = useState("");
  const [featuredOnly, setFeaturedOnly] = useState(true);
  const [rows, setRows] = useState<BizRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, {
    tier: string; sections: string[]; priority: number; until: string;
  }>>({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await search({ data: { search: q || undefined, featured_only: featuredOnly, limit: 80 } });
      setRows(res.rows as BizRow[]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [featuredOnly]);

  const startEdit = (b: BizRow) => {
    setEditing(b.id);
    const until = b.featured_until ? b.featured_until.slice(0, 10) : "";
    setForm({
      ...form,
      [b.id]: {
        tier: b.featured_tier ?? "featured",
        sections: b.featured_sections ?? [],
        priority: b.featured_priority ?? 0,
        until,
      },
    });
  };

  const save = async (b: BizRow, removeFeature = false) => {
    const f = form[b.id];
    try {
      await setFeatured({
        data: {
          business_id: b.id,
          tier: removeFeature ? null : (f.tier as any),
          sections: removeFeature ? [] : f.sections,
          priority: removeFeature ? 0 : Number(f.priority) || 0,
          featured_until: removeFeature
            ? null
            : f.until
              ? new Date(`${f.until}T23:59:59`).toISOString()
              : null,
        },
      });
      toast.success(removeFeature ? "Featured status removed" : "Featured placement saved");
      setEditing(null);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex flex-wrap items-center gap-2 p-4">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && load()}
              placeholder="Search businesses by name…"
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={load}>Search</Button>
          <label className="ml-auto inline-flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={featuredOnly}
              onChange={(e) => setFeaturedOnly(e.target.checked)}
            />
            Show currently featured only
          </label>
        </div>
        {loading ? (
          <div className="grid place-items-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Business</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Sections</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Until</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((b) => {
                const isActive = b.featured_until && new Date(b.featured_until).getTime() > Date.now();
                const editingRow = editing === b.id;
                const f = form[b.id];
                return (
                  <>
                    <TableRow key={b.id}>
                      <TableCell className="font-medium">{b.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {[b.city, b.province].filter(Boolean).join(", ") || "—"}
                      </TableCell>
                      <TableCell>
                        {isActive ? (
                          <Badge className="bg-amber-100 text-amber-700">
                            <Sparkles className="mr-1 h-3 w-3" />{b.featured_tier ?? "featured"}
                          </Badge>
                        ) : (
                          <Badge variant="outline">—</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">{(b.featured_sections ?? []).join(", ") || "—"}</TableCell>
                      <TableCell className="text-xs">{b.featured_priority ?? 0}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {b.featured_until ? new Date(b.featured_until).toLocaleDateString("en-CA") : "—"}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => (editingRow ? setEditing(null) : startEdit(b))}>
                          {editingRow ? "Close" : "Edit"}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {editingRow && f && (
                      <TableRow key={`${b.id}-edit`}>
                        <TableCell colSpan={7} className="bg-muted/30">
                          <div className="grid gap-3 p-3 md:grid-cols-4">
                            <div>
                              <Label className="text-xs">Tier</Label>
                              <Select value={f.tier} onValueChange={(v) => setForm({ ...form, [b.id]: { ...f, tier: v } })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  {FEATURED_TIERS.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-xs">Priority (0-1000)</Label>
                              <Input
                                type="number"
                                min={0}
                                max={1000}
                                value={f.priority}
                                onChange={(e) => setForm({ ...form, [b.id]: { ...f, priority: Number(e.target.value) } })}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Featured until</Label>
                              <Input
                                type="date"
                                value={f.until}
                                onChange={(e) => setForm({ ...form, [b.id]: { ...f, until: e.target.value } })}
                              />
                            </div>
                            <div className="md:col-span-4">
                              <Label className="text-xs">Homepage sections</Label>
                              <div className="mt-1 flex flex-wrap gap-2">
                                {FEATURED_SECTIONS.map((s) => {
                                  const on = f.sections.includes(s.value);
                                  return (
                                    <button
                                      key={s.value}
                                      type="button"
                                      onClick={() => setForm({
                                        ...form,
                                        [b.id]: {
                                          ...f,
                                          sections: on ? f.sections.filter((x) => x !== s.value) : [...f.sections, s.value],
                                        },
                                      })}
                                      className={`rounded-full border px-3 py-1 text-xs ${on ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
                                    >
                                      {s.label}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="md:col-span-4 flex justify-end gap-2">
                              <Button size="sm" variant="outline" onClick={() => save(b, true)}>
                                Remove featured status
                              </Button>
                              <Button size="sm" onClick={() => save(b)}>Save placement</Button>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
