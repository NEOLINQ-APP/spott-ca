import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ClipboardList } from "lucide-react";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { listAdminAuditLog } from "@/lib/admin-command.functions";

export const Route = createFileRoute("/admin/audit-log")({
  component: AdminAuditLog,
  head: () => ({ meta: [{ title: "Audit Log — Spott Admin" }] }),
});

type Row = {
  id: string;
  actor_id: string | null;
  actor_name: string;
  action: string;
  target_type: string;
  target_id: string;
  reason: string | null;
  before: any;
  after: any;
  created_at: string;
};

function AdminAuditLog() {
  const fetchLog = useServerFn(listAdminAuditLog);
  const [rows, setRows] = useState<Row[]>([]);
  const [filter, setFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchLog({ data: { target_type: filter.trim() || undefined, limit: 200 } });
      setRows((res.rows as Row[]) ?? []);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  return (
    <AdminShell
      title="Audit Log"
      description="Every admin action recorded, with before/after diffs and reasons."
      actions={
        <div className="flex items-center gap-2">
          <Input
            placeholder="Filter by target type (e.g. promoter)"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-[260px]"
          />
          <Button size="sm" variant="outline" onClick={load}>Apply</Button>
        </div>
      }
    >
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="grid place-items-center p-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <div className="p-12 text-center text-sm text-muted-foreground">
              <ClipboardList className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              No audit records yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <>
                    <TableRow key={r.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleString("en-CA")}
                      </TableCell>
                      <TableCell className="text-sm">{r.actor_name}</TableCell>
                      <TableCell className="text-sm font-medium">{r.action}</TableCell>
                      <TableCell className="text-sm">
                        <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs">
                          {r.target_type}
                        </span>{" "}
                        <span className="font-mono text-xs text-muted-foreground">
                          {r.target_id?.slice(0, 8)}
                        </span>
                      </TableCell>
                      <TableCell className="max-w-[280px] truncate text-sm text-muted-foreground">
                        {r.reason ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                        >
                          {expanded === r.id ? "Hide" : "Diff"}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expanded === r.id && (
                      <TableRow>
                        <TableCell colSpan={6} className="bg-muted/30">
                          <div className="grid gap-3 p-3 md:grid-cols-2">
                            <div>
                              <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">Before</div>
                              <pre className="max-h-64 overflow-auto rounded bg-background p-2 text-xs">
{JSON.stringify(r.before ?? {}, null, 2)}
                              </pre>
                            </div>
                            <div>
                              <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">After</div>
                              <pre className="max-h-64 overflow-auto rounded bg-background p-2 text-xs">
{JSON.stringify(r.after ?? {}, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AdminShell>
  );
}
