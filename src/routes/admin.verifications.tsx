import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, ShieldCheck, ExternalLink, Check, X } from "lucide-react";
import { toast } from "sonner";
import { AdminShell } from "@/components/admin/AdminShell";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  listVerificationRequests,
  reviewVerification,
} from "@/lib/admin-extra.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/verifications")({
  component: AdminVerifications,
  head: () => ({ meta: [{ title: "Verifications — Spott Admin" }] }),
});

type Row = {
  id: string;
  user_id: string;
  business_id: string | null;
  business_name: string;
  legal_name: string | null;
  business_type: string;
  tax_number: string | null;
  contact_email: string;
  contact_phone: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  document_paths: string[];
  status: string;
  admin_notes: string | null;
  created_at: string;
  reviewed_at: string | null;
};

function AdminVerifications() {
  const fetchList = useServerFn(listVerificationRequests);
  const review = useServerFn(reviewVerification);
  const [status, setStatus] = useState<"pending" | "approved" | "rejected" | "all">("pending");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchList({ data: { status } });
      setRows((res.rows as Row[]) ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [status]);

  const openDoc = async (path: string) => {
    const { data, error } = await supabase
      .storage.from("business-verification")
      .createSignedUrl(path, 60 * 10);
    if (error || !data?.signedUrl) {
      toast.error("Could not open document");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  const act = async (id: string, action: "approve" | "reject") => {
    try {
      await review({ data: { id, action, notes: notes[id] || undefined } });
      toast.success(action === "approve" ? "Verification approved" : "Verification rejected");
      load();
    } catch (e: any) {
      toast.error(e?.message ?? "Action failed");
    }
  };

  const statusBadge = (s: string) => {
    if (s === "approved") return <Badge className="bg-emerald-100 text-emerald-700">Approved</Badge>;
    if (s === "rejected") return <Badge variant="outline" className="text-red-600 border-red-300">Rejected</Badge>;
    return <Badge className="bg-amber-100 text-amber-700">Pending</Badge>;
  };

  return (
    <AdminShell
      title="Verifications"
      description="Review business verification requests and grant Verified Business / Dealer / Realtor badges."
      actions={
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={(v) => setStatus(v as any)}>
            <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={load}>Refresh</Button>
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
              <ShieldCheck className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
              No {status === "all" ? "" : status} verification requests.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Business</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Docs</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <>
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{r.business_name}</div>
                        {r.legal_name && (
                          <div className="text-xs text-muted-foreground">{r.legal_name}</div>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">{r.business_type}</TableCell>
                      <TableCell className="text-sm">
                        <div>{r.contact_email}</div>
                        {r.contact_phone && <div className="text-xs text-muted-foreground">{r.contact_phone}</div>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {[r.city, r.province].filter(Boolean).join(", ") || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {r.document_paths.map((p, i) => (
                            <button
                              key={p}
                              onClick={() => openDoc(p)}
                              className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs hover:bg-accent"
                            >
                              <ExternalLink className="h-3 w-3" /> doc {i + 1}
                            </button>
                          ))}
                          {r.document_paths.length === 0 && <span className="text-xs text-muted-foreground">none</span>}
                        </div>
                      </TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(r.created_at).toLocaleDateString("en-CA")}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                        >
                          {expanded === r.id ? "Close" : "Review"}
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expanded === r.id && (
                      <TableRow>
                        <TableCell colSpan={8} className="bg-muted/30">
                          <div className="space-y-3 p-3">
                            <div className="grid gap-3 text-sm md:grid-cols-2">
                              <div><span className="text-muted-foreground">Tax #:</span> {r.tax_number ?? "—"}</div>
                              <div><span className="text-muted-foreground">Website:</span> {r.website ? <a href={r.website} target="_blank" rel="noreferrer" className="text-primary underline">{r.website}</a> : "—"}</div>
                              <div className="md:col-span-2"><span className="text-muted-foreground">Address:</span> {[r.address, r.city, r.province, r.postal_code].filter(Boolean).join(", ") || "—"}</div>
                              {r.admin_notes && (
                                <div className="md:col-span-2"><span className="text-muted-foreground">Prior notes:</span> {r.admin_notes}</div>
                              )}
                            </div>
                            <Textarea
                              placeholder="Admin notes (optional, shown to applicant)"
                              value={notes[r.id] ?? ""}
                              onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                              rows={2}
                            />
                            <div className="flex gap-2">
                              <Button size="sm" onClick={() => act(r.id, "approve")} className="bg-emerald-600 hover:bg-emerald-700">
                                <Check className="mr-1 h-4 w-4" /> Approve & grant badge
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => act(r.id, "reject")}>
                                <X className="mr-1 h-4 w-4" /> Reject
                              </Button>
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
