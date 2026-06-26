import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listPromoters, updatePromoter, generatePromoterMessage, sendPromoterNotification } from "@/lib/promoters.functions";
import { toast } from "sonner";
import { Loader2, Check, X, Pencil, Save, Send, Sparkles, Mail, MessageSquare, Bell } from "lucide-react";

export function AdminPromotersTab() {
  const list = useServerFn(listPromoters);
  const update = useServerFn(updatePromoter);
  const genMsg = useServerFn(generatePromoterMessage);
  const sendNotif = useServerFn(sendPromoterNotification);

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "suspended">("pending");
  const [editing, setEditing] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, any>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [sendOpen, setSendOpen] = useState<any>(null); // promoter row
  const [sendCode, setSendCode] = useState("");
  const [sendDiscount, setSendDiscount] = useState("");
  const [sendBody, setSendBody] = useState("");
  const [sendSubject, setSendSubject] = useState("");
  const [sendChannels, setSendChannels] = useState<{ in_app: boolean; email: boolean; sms: boolean }>({ in_app: true, email: true, sms: false });
  const [sendTone, setSendTone] = useState<"friendly" | "professional" | "exciting">("friendly");
  const [sendBusy, setSendBusy] = useState<"ai" | "send" | null>(null);

  const openSend = (p: any) => {
    setSendOpen(p);
    setSendCode(""); setSendDiscount(""); setSendBody(""); setSendSubject("");
    setSendChannels({ in_app: true, email: !!p.email, sms: !!p.phone });
    setSendTone("friendly");
  };

  const runAi = async () => {
    if (!sendOpen || !sendCode.trim()) { toast.error("Enter the promo code first"); return; }
    setSendBusy("ai");
    try {
      const primary = sendChannels.sms ? "sms" : sendChannels.email ? "email" : "in_app";
      const r: any = await genMsg({ data: { promoter_id: sendOpen.id, code: sendCode.trim(), discount_label: sendDiscount || undefined, tone: sendTone, channel: primary } });
      setSendBody(r.body); setSendSubject(r.subject ?? "");
      toast.success("AI greeting generated");
    } catch (e: any) { toast.error(e?.message); }
    finally { setSendBusy(null); }
  };

  const doSend = async () => {
    if (!sendOpen) return;
    const channels = (Object.entries(sendChannels).filter(([, v]) => v).map(([k]) => k) as any[]);
    if (!channels.length) { toast.error("Pick at least one channel"); return; }
    if (!sendBody.trim()) { toast.error("Message body is empty"); return; }
    setSendBusy("send");
    try {
      const r: any = await sendNotif({ data: { promoter_id: sendOpen.id, channels, subject: sendSubject || undefined, body: sendBody, coupon_code: sendCode || undefined } });
      const failed = r.results.filter((x: any) => x.status === "failed");
      if (failed.length) toast.warning(`Sent with ${failed.length} issue(s): ${failed.map((f: any) => `${f.channel}: ${f.error}`).join(", ")}`);
      else toast.success("Promo code delivered");
      setSendOpen(null);
    } catch (e: any) { toast.error(e?.message); }
    finally { setSendBusy(null); }
  };

  const refresh = async () => {
    setLoading(true);
    try { setRows(await list({ data: { status: statusFilter } })); }
    catch (e: any) { toast.error(e?.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { refresh(); }, [statusFilter]);

  const setStatus = async (id: string, status: "approved" | "suspended" | "pending") => {
    setBusy(id);
    try {
      await update({ data: { id, status } });
      toast.success(`Promoter ${status}`);
      refresh();
    } catch (e: any) { toast.error(e?.message); }
    finally { setBusy(null); }
  };

  const saveEdits = async (id: string) => {
    setBusy(id);
    try {
      await update({ data: { id, ...edits[id] } });
      toast.success("Saved");
      setEditing(null);
      refresh();
    } catch (e: any) { toast.error(e?.message); }
    finally { setBusy(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {(["pending", "approved", "suspended", "all"] as const).map((s) => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium capitalize ${
              statusFilter === s ? "bg-primary text-primary-foreground" : "bg-card border border-border hover:bg-muted"
            }`}>{s}</button>
        ))}
        {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
      </div>

      <div className="space-y-3">
        {rows.map((p) => {
          const isEditing = editing === p.id;
          const e = edits[p.id] || {};
          return (
            <div key={p.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">{p.display_name}</div>
                  {p.company_name && <div className="text-xs text-muted-foreground">{p.company_name}</div>}
                  <div className="mt-1 text-xs text-muted-foreground">
                    {p.email}{p.phone ? ` · ${p.phone}` : ""}
                    {p.website && <> · <a href={p.website} target="_blank" rel="noreferrer" className="underline">{p.website}</a></>}
                  </div>
                  {p.social_handle && <div className="text-xs text-muted-foreground">Social: {p.social_handle}</div>}
                  {p.pitch && <div className="mt-2 text-sm whitespace-pre-wrap">{p.pitch}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${
                    p.status === "approved" ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" :
                    p.status === "pending" ? "bg-amber-500/15 text-amber-700 dark:text-amber-400" :
                    "bg-muted text-muted-foreground"
                  }`}>{p.status}</span>
                  {p.status === "pending" && (
                    <>
                      <button onClick={() => setStatus(p.id, "approved")} disabled={busy === p.id}
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700">
                        <Check className="h-3 w-3" /> Approve
                      </button>
                      <button onClick={() => setStatus(p.id, "suspended")} disabled={busy === p.id}
                        className="inline-flex items-center gap-1 rounded-md bg-destructive px-2.5 py-1 text-xs font-medium text-destructive-foreground hover:bg-destructive/90">
                        <X className="h-3 w-3" /> Reject
                      </button>
                    </>
                  )}
                  {p.status === "approved" && (
                    <button onClick={() => setStatus(p.id, "suspended")} disabled={busy === p.id}
                      className="rounded-md border border-border px-2.5 py-1 text-xs hover:bg-muted">Suspend</button>
                  )}
                  {p.status === "suspended" && (
                    <button onClick={() => setStatus(p.id, "approved")} disabled={busy === p.id}
                      className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white">Re-approve</button>
                  )}
                </div>
              </div>

              {isEditing ? (
                <div className="mt-4 grid gap-2 border-t border-border pt-3 sm:grid-cols-2 lg:grid-cols-4">
                  <label className="text-xs">
                    <span className="mb-1 block text-muted-foreground">Commission type</span>
                    <select value={e.commission_type ?? p.commission_type}
                      onChange={(ev) => setEdits({ ...edits, [p.id]: { ...e, commission_type: ev.target.value } })}
                      className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm">
                      <option value="flat">Flat (cents per redemption)</option>
                      <option value="percent">Percent</option>
                    </select>
                  </label>
                  <label className="text-xs">
                    <span className="mb-1 block text-muted-foreground">Value</span>
                    <input type="number" min="0" value={e.commission_value ?? p.commission_value}
                      onChange={(ev) => setEdits({ ...edits, [p.id]: { ...e, commission_value: Number(ev.target.value) } })}
                      className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm" />
                  </label>
                  <label className="text-xs">
                    <span className="mb-1 block text-muted-foreground">Payout method</span>
                    <select value={e.payout_method ?? p.payout_method ?? ""}
                      onChange={(ev) => setEdits({ ...edits, [p.id]: { ...e, payout_method: ev.target.value } })}
                      className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm">
                      <option value="">—</option>
                      <option value="etransfer">e-Transfer</option>
                      <option value="paypal">PayPal</option>
                      <option value="stripe">Stripe</option>
                    </select>
                  </label>
                  <label className="text-xs">
                    <span className="mb-1 block text-muted-foreground">Payout details</span>
                    <input value={e.payout_details ?? p.payout_details ?? ""}
                      onChange={(ev) => setEdits({ ...edits, [p.id]: { ...e, payout_details: ev.target.value } })}
                      placeholder="email / handle"
                      className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm" />
                  </label>
                  <label className="text-xs sm:col-span-2 lg:col-span-4">
                    <span className="mb-1 block text-muted-foreground">Admin notes</span>
                    <textarea value={e.notes ?? p.notes ?? ""}
                      onChange={(ev) => setEdits({ ...edits, [p.id]: { ...e, notes: ev.target.value } })}
                      rows={2}
                      className="w-full rounded-md border border-border bg-background px-2 py-1 text-sm" />
                  </label>
                  <div className="flex gap-2 sm:col-span-2 lg:col-span-4">
                    <button onClick={() => saveEdits(p.id)} disabled={busy === p.id}
                      className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">
                      <Save className="h-3 w-3" /> Save
                    </button>
                    <button onClick={() => setEditing(null)} className="text-xs text-muted-foreground hover:underline">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3 text-xs text-muted-foreground">
                  <div>
                    Commission: <strong className="text-foreground">
                      {p.commission_type === "flat" ? `$${(p.commission_value / 100).toFixed(2)}` : `${p.commission_value}%`}
                    </strong> per redemption
                    {p.payout_method && <> · Payout: {p.payout_method} {p.payout_details ? `(${p.payout_details})` : ""}</>}
                  </div>
                  <div className="flex items-center gap-3">
                    {p.status === "approved" && (
                      <button onClick={() => openSend(p)}
                        className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                        <Send className="h-3 w-3" /> Send promo code
                      </button>
                    )}
                    <button onClick={() => { setEditing(p.id); setEdits({ ...edits, [p.id]: {} }); }}
                      className="inline-flex items-center gap-1 text-xs hover:text-foreground">
                      <Pencil className="h-3 w-3" /> Edit
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
        {rows.length === 0 && !loading && (
          <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No {statusFilter !== "all" ? statusFilter : ""} promoters.
          </div>
        )}
      </div>
    </div>
  );
}
