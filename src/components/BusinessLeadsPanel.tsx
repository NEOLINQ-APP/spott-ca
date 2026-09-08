import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { Inbox, Loader2, Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import { updateBusinessLeadForOwner } from "@/lib/leads.functions";

type Lead = {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  source: string;
  status: "new" | "contacted" | "qualified" | "closed_won" | "closed_lost";
  owner_notes: string | null;
  created_at: string;
  business?: { name: string } | null;
};

const STATUS_LABELS: Record<Lead["status"], string> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  closed_won: "Won",
  closed_lost: "Lost",
};

const STATUS_ORDER: Lead["status"][] = ["new", "contacted", "qualified", "closed_won", "closed_lost"];

/**
 * Real inbox for business_leads — this data has been captured since
 * submitBusinessLead() shipped (every "Request a quote" form on a business
 * page), but until now there was no route/UI anywhere that read it back
 * for the owner. Mirrors MessagesPanel.tsx's shape: a plain client-side
 * RLS-scoped read (the "Business owners view their leads" SELECT policy
 * already restricts this to the caller's own businesses across however
 * many they own — no business_id selector needed), writes go through
 * updateBusinessLeadForOwner (service-role + an explicit ownership check,
 * since this table intentionally has no RLS UPDATE policy).
 */
export function BusinessLeadsPanel() {
  const updateLead = useServerFn(updateBusinessLeadForOwner);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Lead["status"] | "all">("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [saving, setSaving] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("business_leads")
      .select("id,business_id,name,email,phone,message,source,status,owner_notes,created_at,businesses(name)")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast.error(error.message);
    } else {
      setLeads(((data ?? []) as any[]).map((r) => ({ ...r, business: r.businesses })) as Lead[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { new: 0, contacted: 0, qualified: 0, closed_won: 0, closed_lost: 0 };
    for (const l of leads) counts[l.status] = (counts[l.status] ?? 0) + 1;
    return counts;
  }, [leads]);

  const visible = filter === "all" ? leads : leads.filter((l) => l.status === filter);

  const openLead = (l: Lead) => {
    setExpandedId(expandedId === l.id ? null : l.id);
    setNotesDraft(l.owner_notes ?? "");
  };

  const changeStatus = async (l: Lead, status: Lead["status"]) => {
    setSaving(l.id);
    try {
      await updateLead({ data: { id: l.id, business_id: l.business_id, status } });
      setLeads((prev) => prev.map((x) => (x.id === l.id ? { ...x, status } : x)));
    } catch (e: any) {
      toast.error(e?.message ?? "Could not update lead");
    } finally {
      setSaving(null);
    }
  };

  const saveNotes = async (l: Lead) => {
    setSaving(l.id);
    try {
      await updateLead({ data: { id: l.id, business_id: l.business_id, owner_notes: notesDraft } });
      setLeads((prev) => prev.map((x) => (x.id === l.id ? { ...x, owner_notes: notesDraft } : x)));
      toast.success("Notes saved");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save notes");
    } finally {
      setSaving(null);
    }
  };

  if (loading) return <div className="h-40 animate-pulse rounded-2xl bg-card/60" />;

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Inbox className="h-4 w-4 text-primary" /> Leads
          {leads.length > 0 && <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">{leads.length}</span>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"}`}
          >
            All ({leads.length})
          </button>
          {STATUS_ORDER.map((s) => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium ${filter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground hover:bg-secondary/80"}`}
            >
              {STATUS_LABELS[s]} ({statusCounts[s] ?? 0})
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="p-8 text-center text-xs text-muted-foreground">
          No leads yet. When someone requests a quote on one of your listings, it'll show up here.
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {visible.map((l) => (
            <li key={l.id} className="p-4">
              <button onClick={() => openLead(l)} className="flex w-full items-start justify-between gap-3 text-left">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{l.name}</span>
                    {l.business && <span className="text-xs text-muted-foreground">· {l.business.name}</span>}
                  </div>
                  {l.message && <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{l.message}</p>}
                  <div className="mt-1 text-[10px] text-muted-foreground">{new Date(l.created_at).toLocaleString()}</div>
                </div>
                <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] font-medium">{STATUS_LABELS[l.status]}</span>
              </button>

              {expandedId === l.id && (
                <div className="mt-3 space-y-3 rounded-xl bg-secondary/40 p-3">
                  <div className="flex flex-wrap gap-3 text-xs">
                    {l.email && (
                      <a href={`mailto:${l.email}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                        <Mail className="h-3.5 w-3.5" /> {l.email}
                      </a>
                    )}
                    {l.phone && (
                      <a href={`tel:${l.phone}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                        <Phone className="h-3.5 w-3.5" /> {l.phone}
                      </a>
                    )}
                  </div>
                  {l.message && <p className="whitespace-pre-wrap text-xs">{l.message}</p>}

                  <div className="flex flex-wrap gap-1.5">
                    {STATUS_ORDER.map((s) => (
                      <button
                        key={s}
                        disabled={saving === l.id}
                        onClick={() => changeStatus(l, s)}
                        className={`rounded-full px-2.5 py-1 text-[11px] font-medium disabled:opacity-50 ${l.status === s ? "bg-primary text-primary-foreground" : "bg-background border border-border hover:bg-accent/10"}`}
                      >
                        {STATUS_LABELS[s]}
                      </button>
                    ))}
                  </div>

                  <div>
                    <textarea
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      placeholder="Internal notes (only you can see this)…"
                      rows={2}
                      className="w-full resize-y rounded-md border border-border bg-background px-2.5 py-1.5 text-xs focus:border-primary focus:outline-none"
                    />
                    <button
                      disabled={saving === l.id}
                      onClick={() => saveNotes(l)}
                      className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                    >
                      {saving === l.id ? <Loader2 className="h-3 w-3 animate-spin" /> : null} Save notes
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
