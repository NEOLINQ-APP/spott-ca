import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, Sparkles, Plus, Trash2, Download } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import {
  listSponsoredListingsAdmin,
  upsertSponsoredListing,
  deleteSponsoredListing,
  listSponsoredLeadsAdmin,
  sponsoredLeadInsights,
} from "@/lib/sponsored.functions";

export const Route = createFileRoute("/admin/sponsored")({
  component: AdminSponsored,
  head: () => ({ meta: [{ title: "Sponsored Listings — Spott Admin" }] }),
});

type SponsoredRow = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  video_url: string | null;
  price_cents: number | null;
  currency: string;
  category_id: string | null;
  city: string | null;
  province: string | null;
  sponsor_name: string | null;
  cta_label: string;
  is_active: boolean;
  sort_order: number;
  click_count: number;
  lead_count: number;
};

const EMPTY_FORM = {
  title: "",
  description: "",
  image_url: "",
  video_url: "",
  price_cents: "" as string | number,
  category_id: "",
  city: "",
  province: "",
  sponsor_name: "",
  cta_label: "Learn more",
  is_active: true,
  sort_order: 0,
};

function AdminSponsored() {
  return (
    <AdminShell
      title="Sponsored Listings"
      description="Curated/paid placements shown alongside real marketplace listings, clearly labeled Sponsored. Clicking one captures a lead instead of contacting a fake seller."
    >
      <Tabs defaultValue="listings" className="w-full">
        <TabsList>
          <TabsTrigger value="listings">Listings</TabsTrigger>
          <TabsTrigger value="leads">Leads & Insights</TabsTrigger>
        </TabsList>
        <TabsContent value="listings" className="mt-4">
          <ListingsTab />
        </TabsContent>
        <TabsContent value="leads" className="mt-4">
          <LeadsTab />
        </TabsContent>
      </Tabs>
    </AdminShell>
  );
}

function ListingsTab() {
  const list = useServerFn(listSponsoredListingsAdmin);
  const upsert = useServerFn(upsertSponsoredListing);
  const del = useServerFn(deleteSponsoredListing);
  const [rows, setRows] = useState<SponsoredRow[]>([]);
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [form, setForm] = useState<typeof EMPTY_FORM>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await list();
      setRows(res as SponsoredRow[]);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    supabase
      .from("marketplace_categories")
      .select("id,name")
      .order("name")
      .then(({ data }) => setCats(data ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startNew = () => {
    setForm(EMPTY_FORM);
    setEditing("new");
  };

  const startEdit = (r: SponsoredRow) => {
    setForm({
      title: r.title,
      description: r.description ?? "",
      image_url: r.image_url ?? "",
      video_url: r.video_url ?? "",
      price_cents: r.price_cents != null ? r.price_cents / 100 : "",
      category_id: r.category_id ?? "",
      city: r.city ?? "",
      province: r.province ?? "",
      sponsor_name: r.sponsor_name ?? "",
      cta_label: r.cta_label,
      is_active: r.is_active,
      sort_order: r.sort_order,
    });
    setEditing(r.id);
  };

  const save = async () => {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    setSaving(true);
    try {
      await upsert({
        data: {
          id: editing !== "new" ? (editing as string) : undefined,
          title: form.title,
          description: form.description,
          image_url: form.image_url,
          video_url: form.video_url,
          price_cents: form.price_cents === "" ? null : Math.round(Number(form.price_cents) * 100),
          category_id: form.category_id,
          city: form.city,
          province: form.province,
          sponsor_name: form.sponsor_name,
          cta_label: form.cta_label || "Learn more",
          is_active: form.is_active,
          sort_order: Number(form.sort_order) || 0,
        },
      });
      toast.success("Saved");
      setEditing(null);
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this sponsored listing? Its lead history stays but is unlinked.")) return;
    try {
      await del({ data: { id } });
      toast.success("Deleted");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Delete failed");
    }
  };

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4">
          <p className="text-sm text-muted-foreground">{rows.length} sponsored listing{rows.length === 1 ? "" : "s"}</p>
          <Button size="sm" onClick={startNew}>
            <Plus className="mr-1 h-4 w-4" /> New sponsored listing
          </Button>
        </div>

        {editing && (
          <div className="border-y bg-muted/30 p-4">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <Label className="text-xs">Title</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Sponsor name (shown on card)</Label>
                <Input value={form.sponsor_name} onChange={(e) => setForm({ ...form, sponsor_name: e.target.value })} placeholder="e.g. a brand or partner name" />
              </div>
              <div className="md:col-span-2">
                <Label className="text-xs">Description (shown in the lead form)</Label>
                <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Image URL</Label>
                <Input value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} placeholder="https://…" />
              </div>
              <div>
                <Label className="text-xs">Video URL (optional)</Label>
                <Input value={form.video_url} onChange={(e) => setForm({ ...form, video_url: e.target.value })} placeholder="https://…" />
              </div>
              <div>
                <Label className="text-xs">Price (CAD, optional)</Label>
                <Input type="number" min={0} value={form.price_cents} onChange={(e) => setForm({ ...form, price_cents: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <select
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                >
                  <option value="">— none —</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label className="text-xs">City</Label>
                <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="leave blank for Canada-wide" />
              </div>
              <div>
                <Label className="text-xs">Province</Label>
                <Input value={form.province} onChange={(e) => setForm({ ...form, province: e.target.value })} maxLength={2} />
              </div>
              <div>
                <Label className="text-xs">Call-to-action label</Label>
                <Input value={form.cta_label} onChange={(e) => setForm({ ...form, cta_label: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Sort order (lower shows first)</Label>
                <Input type="number" value={form.sort_order} onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })} />
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                <Label className="text-sm">Active (visible on the site)</Label>
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save
              </Button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="grid place-items-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center text-sm text-muted-foreground">No sponsored listings yet.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Sponsor</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Clicks</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{r.sponsor_name ?? "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {[r.city, r.province].filter(Boolean).join(", ") || "Canada-wide"}
                  </TableCell>
                  <TableCell>
                    {r.is_active ? (
                      <Badge className="bg-amber-100 text-amber-700">
                        <Sparkles className="mr-1 h-3 w-3" /> Active
                      </Badge>
                    ) : (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm tabular-nums">{r.click_count}</TableCell>
                  <TableCell className="text-sm tabular-nums font-medium">{r.lead_count}</TableCell>
                  <TableCell className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => startEdit(r)}>Edit</Button>
                    <Button size="sm" variant="outline" onClick={() => remove(r.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

type LeadRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  city: string | null;
  province: string | null;
  created_at: string;
  sponsored_listings?: { title: string } | null;
  marketplace_categories?: { name: string } | null;
};

function LeadsTab() {
  const listLeads = useServerFn(listSponsoredLeadsAdmin);
  const insights = useServerFn(sponsoredLeadInsights);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [ins, setIns] = useState<Awaited<ReturnType<typeof sponsoredLeadInsights>> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [l, i] = await Promise.all([listLeads(), insights()]);
        setLeads(l as LeadRow[]);
        setIns(i);
      } catch (e: any) {
        toast.error(e?.message ?? "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportCsv = () => {
    const header = ["name", "email", "phone", "city", "province", "listing", "category", "message", "created_at"];
    const lines = leads.map((l) =>
      [
        l.name, l.email ?? "", l.phone ?? "", l.city ?? "", l.province ?? "",
        l.sponsored_listings?.title ?? "", l.marketplace_categories?.name ?? "",
        (l.message ?? "").replace(/[\r\n,]+/g, " "), l.created_at,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(","),
    );
    const csv = [header.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sponsored-leads.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="grid place-items-center p-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold">What Canadians are interested in — by category</h3>
            <div className="mt-3 space-y-1.5">
              {(ins?.byCategory ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No leads yet.</p>
              ) : (
                ins!.byCategory.map((c) => (
                  <div key={c.name} className="flex items-center justify-between text-sm">
                    <span>{c.name}</span>
                    <span className="font-semibold tabular-nums">{c.count}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold">By city</h3>
            <div className="mt-3 space-y-1.5">
              {(ins?.byCity ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">No leads yet.</p>
              ) : (
                ins!.byCity.slice(0, 10).map((c) => (
                  <div key={c.city} className="flex items-center justify-between text-sm">
                    <span>{c.city}</span>
                    <span className="font-semibold tabular-nums">{c.count}</span>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-4">
            <p className="text-sm text-muted-foreground">{leads.length} lead{leads.length === 1 ? "" : "s"} captured</p>
            <Button size="sm" variant="outline" onClick={exportCsv} disabled={leads.length === 0}>
              <Download className="mr-1 h-4 w-4" /> Export CSV
            </Button>
          </div>
          {leads.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              No leads yet — they'll show up here once someone clicks a sponsored listing and submits interest.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Listing</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium">{l.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {[l.email, l.phone].filter(Boolean).join(" · ") || "—"}
                    </TableCell>
                    <TableCell className="text-sm">{l.sponsored_listings?.title ?? "—"}</TableCell>
                    <TableCell className="text-sm">{l.marketplace_categories?.name ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {[l.city, l.province].filter(Boolean).join(", ") || "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(l.created_at).toLocaleString("en-CA")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
