import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Search, FolderTree } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  adminListMiscategorized,
  adminBulkCategorize,
  adminListCategoriesFlat,
} from "@/lib/admin-content.functions";

export const Route = createFileRoute("/admin/listings/bulk-categorize")({
  component: BulkCategorize,
  head: () => ({ meta: [{ title: "Bulk Re-Categorize — Spott Admin" }] }),
});

type Row = {
  id: string;
  title: string;
  status: string | null;
  category_id: string | null;
  city: string | null;
  province: string | null;
  created_at: string;
  tags: string[] | null;
};

type Cat = {
  id: string;
  slug: string;
  name: string;
  parent_slug: string | null;
  sort_order: number;
};

function BulkCategorize() {
  const listFn = useServerFn(adminListMiscategorized);
  const catsFn = useServerFn(adminListCategoriesFlat);
  const bulkFn = useServerFn(adminBulkCategorize);

  const [rows, setRows] = useState<Row[]>([]);
  const [count, setCount] = useState(0);
  const [cats, setCats] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"uncategorized" | "category" | "all">("uncategorized");
  const [filterCategoryId, setFilterCategoryId] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [targetParent, setTargetParent] = useState("");
  const [targetCategoryId, setTargetCategoryId] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const catById = useMemo(() => new Map(cats.map((c) => [c.id, c])), [cats]);
  const topCats = useMemo(() => cats.filter((c) => !c.parent_slug), [cats]);
  const subCats = useMemo(
    () => (targetParent ? cats.filter((c) => c.parent_slug === targetParent) : []),
    [cats, targetParent],
  );

  async function load() {
    setLoading(true);
    setSelected(new Set());
    try {
      const r = await listFn({
        data: {
          filter,
          category_id: filter === "category" ? filterCategoryId || undefined : undefined,
          search: search.trim() || undefined,
          limit: 100,
        },
      });
      setRows((r?.rows as Row[]) ?? []);
      setCount(r?.count ?? 0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    catsFn({} as never).then((r) => setCats((r?.categories as Cat[]) ?? []));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, filterCategoryId]);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };
  const toggleAll = () => {
    if (selected.size === rows.length) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };

  async function applyBulk() {
    const parentCat = topCats.find((c) => c.slug === targetParent);
    const effective = targetCategoryId || parentCat?.id || "";
    if (!effective) {
      toast.error("Pick a target category first.");
      return;
    }
    if (subCats.length > 0 && !targetCategoryId) {
      toast.error("Pick a subcategory for this parent.");
      return;
    }
    if (selected.size === 0) {
      toast.error("Select at least one listing.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await bulkFn({
        data: {
          ids: Array.from(selected),
          category_id: effective,
          reason: reason.trim() || undefined,
        },
      });
      toast.success(`Re-categorized ${r?.count ?? 0} listing${(r?.count ?? 0) === 1 ? "" : "s"}.`);
      setReason("");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to re-categorize");
    } finally {
      setSubmitting(false);
    }
  }

  const catLabel = (id: string | null) => {
    if (!id) return "—";
    const c = catById.get(id);
    if (!c) return id.slice(0, 8);
    const parent = c.parent_slug ? cats.find((p) => p.slug === c.parent_slug) : null;
    return parent ? `${parent.name} › ${c.name}` : c.name;
  };

  return (
    <AdminShell
      title="Bulk Re-Categorize"
      description="Fix uncategorized or misclassified listings by re-assigning them to the correct category in bulk."
    >
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <FolderTree className="h-4 w-4 text-primary" /> Target category
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <select
              value={targetParent}
              onChange={(e) => {
                setTargetParent(e.target.value);
                setTargetCategoryId("");
              }}
              className="h-10 rounded-md border bg-background px-2 text-sm"
            >
              <option value="">Parent category…</option>
              {topCats.map((c) => (
                <option key={c.id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              value={targetCategoryId}
              onChange={(e) => setTargetCategoryId(e.target.value)}
              disabled={!targetParent || subCats.length === 0}
              className="h-10 rounded-md border bg-background px-2 text-sm"
            >
              <option value="">
                {!targetParent
                  ? "Pick a parent first"
                  : subCats.length === 0
                  ? "No subcategories — using parent"
                  : "Subcategory…"}
              </option>
              {subCats.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Optional audit note (why this move)…"
            className="mt-3"
          />
          <div className="mt-3 flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {selected.size} selected · will move to <strong>{targetParent ? (targetCategoryId ? cats.find((c) => c.id === targetCategoryId)?.name : topCats.find((c) => c.slug === targetParent)?.name) : "—"}</strong>
            </span>
            <Button onClick={applyBulk} disabled={submitting || selected.size === 0}>
              {submitting && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              Re-categorize {selected.size} listing{selected.size === 1 ? "" : "s"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              load();
            }}
            className="mb-4 flex flex-wrap items-center gap-2"
          >
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="h-10 rounded-md border bg-background px-2 text-sm"
            >
              <option value="uncategorized">Uncategorized</option>
              <option value="category">By current category…</option>
              <option value="all">All listings</option>
            </select>
            {filter === "category" && (
              <select
                value={filterCategoryId}
                onChange={(e) => setFilterCategoryId(e.target.value)}
                className="h-10 rounded-md border bg-background px-2 text-sm"
              >
                <option value="">Pick a category…</option>
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.parent_slug ? "  " : ""}{c.name}
                  </option>
                ))}
              </select>
            )}
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title…"
                className="pl-9"
              />
            </div>
            <Button type="submit" size="sm">
              Filter
            </Button>
            <span className="ml-auto text-xs text-muted-foreground">{count} total</span>
          </form>

          {loading ? (
            <div className="grid place-items-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              Nothing to fix here. 🎉
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="py-2 pr-3">
                      <input
                        type="checkbox"
                        checked={selected.size === rows.length && rows.length > 0}
                        onChange={toggleAll}
                        aria-label="Select all"
                      />
                    </th>
                    <th className="py-2 pr-3">Title</th>
                    <th className="py-2 pr-3">Current category</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Location</th>
                    <th className="py-2 pr-3">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.id}
                      className={`border-b hover:bg-muted/30 ${selected.has(r.id) ? "bg-primary/5" : ""}`}
                    >
                      <td className="py-2 pr-3">
                        <input
                          type="checkbox"
                          checked={selected.has(r.id)}
                          onChange={() => toggle(r.id)}
                          aria-label={`Select ${r.title}`}
                        />
                      </td>
                      <td className="py-2 pr-3 font-medium">{r.title}</td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {r.category_id ? (
                          catLabel(r.category_id)
                        ) : (
                          <Badge variant="destructive">Uncategorized</Badge>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        <Badge variant={r.status === "active" ? "default" : "secondary"}>
                          {r.status ?? "—"}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {[r.city, r.province].filter(Boolean).join(", ") || "—"}
                      </td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("en-CA")}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </AdminShell>
  );
}
