import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Gift, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Props = { businessId: string; businessName: string; referralCode: string | null };

export function ReferralPanel({ businessId, businessName, referralCode }: Props) {
  const [referrals, setReferrals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("business_referrals")
        .select("id,status,created_at,reward_granted_at,referred_business_id")
        .eq("referrer_business_id", businessId)
        .order("created_at", { ascending: false });
      setReferrals(data ?? []);
      setLoading(false);
    })();
  }, [businessId]);

  if (!referralCode) {
    return (
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Gift className="h-4 w-4" /> Your referral code will appear once your listing is verified.
        </div>
      </div>
    );
  }

  const url = `https://www.spott.ca/?ref=${referralCode}`;
  const rewarded = referrals.filter((r) => r.status === "rewarded").length;
  const pending = referrals.filter((r) => r.status === "pending").length;

  const copy = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Referral link copied");
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" />
            <h3 className="font-display text-base font-semibold">Refer & earn — {businessName}</h3>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Share this link or QR. When the business you refer claims their listing, you get <strong>30 days of Featured</strong>.
          </p>
        </div>
        <div className="rounded-md bg-background p-2">
          <QRCodeSVG value={url} size={88} bgColor="transparent" fgColor="currentColor" />
        </div>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <code className="flex-1 truncate rounded-md bg-background px-3 py-2 text-xs">{url}</code>
        <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs font-medium hover:bg-accent/10">
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} Copy
        </button>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
        <Stat label="Total" value={referrals.length} />
        <Stat label="Pending" value={pending} />
        <Stat label="Rewarded" value={rewarded} />
      </div>

      {loading ? (
        <div className="mt-3 flex items-center justify-center py-4 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /></div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-border bg-background py-2">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
