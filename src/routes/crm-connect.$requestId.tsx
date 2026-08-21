import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { getMyCrmConnectionRequest, approveCrmConnection, denyCrmConnection } from "@/lib/crm-connections.functions";
import { toast } from "sonner";
import { Loader2, ShieldAlert, Copy, Check } from "lucide-react";

export const Route = createFileRoute("/crm-connect/$requestId")({
  component: CrmConnectPage,
  head: () => ({
    meta: [
      { title: "Approve CRM connection — Spott" },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

type ReqInfo = Awaited<ReturnType<typeof getMyCrmConnectionRequest>>;

function CrmConnectPage() {
  const { requestId } = Route.useParams();
  const getFn = useServerFn(getMyCrmConnectionRequest);
  const approveFn = useServerFn(approveCrmConnection);
  const denyFn = useServerFn(denyCrmConnection);

  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [info, setInfo] = useState<ReqInfo | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [acting, setActing] = useState(false);
  const [code, setCode] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user?.id ?? null;
      setUserId(uid);
      if (!uid) { setLoading(false); return; }
      try {
        const res = await getFn({ data: { request_id: requestId } });
        setInfo(res);
      } catch (e: any) {
        setErrorMsg(e?.message || "Could not load this request");
      }
      setLoading(false);
    })();
  }, [requestId, getFn]);

  const onApprove = async () => {
    setActing(true);
    try {
      const res = await approveFn({ data: { request_id: requestId } });
      setCode(res.code);
      setInfo((i) => (i ? { ...i, status: "approved" } : i));
      toast.success("Approved — share this code with them once.");
    } catch (e: any) {
      toast.error(e?.message || "Could not approve");
    } finally {
      setActing(false);
    }
  };

  const onDeny = async () => {
    setActing(true);
    try {
      await denyFn({ data: { request_id: requestId } });
      setInfo((i) => (i ? { ...i, status: "denied" } : i));
      toast.success("Denied");
    } catch (e: any) {
      toast.error(e?.message || "Could not deny");
    } finally {
      setActing(false);
    }
  };

  const copyCode = async () => {
    if (!code) return;
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) return <div className="min-h-dvh grid place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (!userId) {
    return (
      <div className="min-h-dvh"><SiteHeader />
        <div className="mx-auto max-w-lg px-6 py-16 text-center">
          <p className="text-sm text-muted-foreground">Sign in as the owner of this listing to review this request.</p>
          <Link to="/auth" className="mt-4 inline-block text-primary hover:underline">Sign in</Link>
        </div>
      </div>
    );
  }

  if (errorMsg || !info) {
    return (
      <div className="min-h-dvh"><SiteHeader />
        <div className="mx-auto max-w-lg px-6 py-16 text-center text-sm text-muted-foreground">
          {errorMsg || "Request not found."}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background"><SiteHeader />
      <div className="mx-auto max-w-lg px-6 py-12">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          <ShieldAlert className="h-3.5 w-3.5" /> CRM connection request
        </div>
        <h1 className="font-display text-2xl font-bold">
          <span className="text-primary">{info.requesting_org_name}</span> wants to connect to your listing
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          For <span className="font-medium text-foreground">{info.business_name}</span>. Contact: {info.requesting_contact_email}.
          If approved, your leads, listing updates, and reviews will flow into their CRM automatically.
        </p>

        {info.status === "pending" && !code && (
          <div className="mt-8 flex gap-3">
            <button disabled={acting} onClick={onApprove}
              className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {acting && <Loader2 className="h-4 w-4 animate-spin" />} Approve
            </button>
            <button disabled={acting} onClick={onDeny}
              className="inline-flex items-center gap-2 rounded-full border border-border px-5 py-2.5 text-sm font-semibold hover:bg-accent/10 disabled:opacity-50">
              Deny
            </button>
          </div>
        )}

        {code && (
          <div className="mt-8 rounded-xl border-2 border-primary/40 bg-primary/5 p-5">
            <div className="text-sm font-semibold">Share this code with {info.requesting_org_name}</div>
            <p className="mt-1 text-xs text-muted-foreground">Valid for 10 minutes, works once. This is the only time it's shown.</p>
            <div className="mt-3 flex items-center gap-2">
              <code className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-lg font-mono tracking-widest">{code}</code>
              <button onClick={copyCode} className="rounded-md border border-border p-2 hover:bg-accent/10">
                {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </button>
            </div>
          </div>
        )}

        {info.status !== "pending" && !code && (
          <p className="mt-8 text-sm text-muted-foreground">This request is already {info.status}.</p>
        )}
      </div>
    </div>
  );
}
