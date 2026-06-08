import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listDealerLeads, updateDealerLeadStatus } from "@/lib/dealer.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Mail, Phone } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dealer/leads")({ component: DealerLeadsPage });

const STATUSES = ["new", "contacted", "qualified", "closed_won", "closed_lost"] as const;

function DealerLeadsPage() {
  const fetchFn = useServerFn(listDealerLeads);
  const updateFn = useServerFn(updateDealerLeadStatus);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["dealer-leads"],
    queryFn: () => fetchFn(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading leads…
      </div>
    );
  }

  const leads = data?.leads ?? [];

  async function setStatus(id: string, status: (typeof STATUSES)[number]) {
    try {
      await updateFn({ data: { lead_id: id, status } });
      toast.success("Lead updated");
      qc.invalidateQueries({ queryKey: ["dealer-leads"] });
      qc.invalidateQueries({ queryKey: ["dealer-overview"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't update lead");
    }
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Leads ({leads.length})</h2>
      {leads.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          No leads yet. Customers' test-drive, contact and trade-in requests for your vehicles will show up here.
        </Card>
      ) : (
        <div className="space-y-3">
          {leads.map((l: any) => (
            <Card key={l.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{l.full_name}</h3>
                    <Badge variant="outline" className="capitalize">{l.lead_type.replace("_", " ")}</Badge>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <a href={`mailto:${l.email}`} className="inline-flex items-center gap-1 hover:text-foreground"><Mail className="h-3 w-3"/>{l.email}</a>
                    {l.phone && <a href={`tel:${l.phone}`} className="inline-flex items-center gap-1 hover:text-foreground"><Phone className="h-3 w-3"/>{l.phone}</a>}
                    <span>{new Date(l.created_at).toLocaleString("en-CA")}</span>
                  </div>
                  {l.vehicle && (
                    <div className="mt-2 text-sm">
                      Re: <Link to="/vehicles/$id" params={{ id: l.vehicle_id }} className="underline">
                        {l.vehicle.title ?? [l.vehicle.year, l.vehicle.make, l.vehicle.model].filter(Boolean).join(" ")}
                      </Link>
                    </div>
                  )}
                  {l.message && <p className="mt-2 text-sm text-foreground/90 whitespace-pre-wrap">{l.message}</p>}
                  {(l.preferred_date || l.preferred_time) && (
                    <div className="mt-1 text-xs text-muted-foreground">
                      Preferred: {l.preferred_date ?? ""} {l.preferred_time ?? ""}
                    </div>
                  )}
                </div>
                <Select value={l.status} onValueChange={(v) => setStatus(l.id, v as any)}>
                  <SelectTrigger className="w-[160px]"><SelectValue/></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
