import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { QRCodeSVG } from "qrcode.react";
import { SiteHeader } from "@/components/site-header";
import { PartnerShell } from "@/components/partner/PartnerShell";
import { useAuth } from "@/hooks/use-auth";
import { getMySpottAutoPartner, recordSpottAutoEvent } from "@/lib/spott-auto.functions";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, Check, Share2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/partner/referral")({
  component: ReferralCenter,
  head: () => ({ meta: [{ title: "Referral Center — SPOTT Auto" }] }),
});

function ReferralCenter() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const getPartner = useServerFn(getMySpottAutoPartner);
  const recordEvent = useServerFn(recordSpottAutoEvent);
  const [partner, setPartner] = useState<any>(undefined);
  const [busy, setBusy] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!loading && !user) { navigate({ to: "/auth" }); return; }
    if (!user) return;
    getPartner().then(setPartner).finally(() => setBusy(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  if (loading || busy) return <><SiteHeader /><div className="mx-auto max-w-6xl p-12"><Loader2 className="h-6 w-6 animate-spin" /></div></>;
  if (!partner) return <><SiteHeader /><main className="mx-auto max-w-3xl px-4 py-16 text-center"><h1 className="text-2xl font-bold">You're not a SPOTT Auto partner yet</h1><p className="mt-2 text-muted-foreground">Apply from the Partner Dashboard first.</p></main></>;
  if (partner.status !== "active") return <><SiteHeader /><main className="mx-auto max-w-3xl px-4 py-16 text-center"><h1 className="text-2xl font-bold capitalize">Application {partner.status}</h1></main></>;

  const origin = typeof window !== "undefined" ? window.location.origin : "https://www.spott.ca";
  const link = `${origin}/r/${partner.referral_code}`;
  const qrLink = `${link}?src=qr`;

  const copy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
    toast.success("Link copied");
  };

  const share = async () => {
    recordEvent({ data: { event_type: "partner_share" } }).catch(() => {});
    if (navigator.share) {
      try { await navigator.share({ title: "Spott.ca vehicle financing", url: link }); return; } catch { /* user cancelled */ }
    }
    copy();
  };

  return (
    <PartnerShell displayName={partner.display_name}>
      <header className="mb-6">
        <h1 className="text-2xl font-bold">Referral Center</h1>
        <p className="text-sm text-muted-foreground">Share your link — every click, signup, and financing application is tracked back to you.</p>
      </header>

      <div className="grid gap-6 sm:grid-cols-[auto_1fr]">
        <div className="flex items-center justify-center rounded-xl border border-border bg-card p-5">
          <div className="rounded-lg bg-white p-3">
            <QRCodeSVG value={qrLink} size={160} />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Your referral link</div>
          <code className="mt-2 block break-all rounded bg-muted px-3 py-2 text-sm">{link}</code>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button onClick={copy} variant="outline">
              {copied ? <Check className="mr-1 h-3.5 w-3.5" /> : <Copy className="mr-1 h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy link"}
            </Button>
            <Button onClick={share}><Share2 className="mr-1 h-3.5 w-3.5" /> Share</Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Referral code: <span className="font-mono text-foreground">{partner.referral_code}</span>. The QR code above tags scans separately from typed-link clicks, so you can see which channel is working.
          </p>
        </div>
      </div>
    </PartnerShell>
  );
}
