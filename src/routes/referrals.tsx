import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { QRCodeSVG } from "qrcode.react";
import { Copy, Check, Gift, Share2, Sparkles, Loader2, Trophy } from "lucide-react";
import { toast } from "sonner";
import { getMyReferrals, redeemReferralReward } from "@/lib/referrals.functions";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/referrals")({
  component: ReferralsPage,
  head: () => ({
    meta: [
      { title: "Refer friends, earn Featured — Spott.ca" },
      {
        name: "description",
        content:
          "Invite friends to Spott.ca. When they post their first listing, you unlock 30 days of Featured placement — free.",
      },
    ],
  }),
});

function ReferralsPage() {
  const fetchMine = useServerFn(getMyReferrals);
  const redeem = useServerFn(redeemReferralReward);
  const [state, setState] = useState<Awaited<ReturnType<typeof getMyReferrals>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [targets, setTargets] = useState<{ id: string; label: string; type: "business" | "marketplace_listing" }[]>([]);

  useEffect(() => {
    (async () => {
      const [{ data: sess }] = [await supabase.auth.getSession()];
      if (!sess.session) {
        setLoading(false);
        return;
      }
      const result = await fetchMine();
      setState(result);
      // Collect claim targets: user's businesses + marketplace listings
      const uid = sess.session.user.id;
      const [{ data: biz }, { data: mp }] = await Promise.all([
        supabase.from("businesses").select("id,name").eq("owner_id", uid).limit(20),
        supabase.from("marketplace_listings").select("id,title").eq("user_id", uid).eq("status", "active").limit(20),
      ]);
      const opts = [
        ...(biz ?? []).map((b) => ({ id: b.id, label: `${b.name} (business)`, type: "business" as const })),
        ...(mp ?? []).map((l) => ({ id: l.id, label: `${l.title} (listing)`, type: "marketplace_listing" as const })),
      ];
      setTargets(opts);
      setLoading(false);
    })();
  }, [fetchMine]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!state) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-display text-3xl font-semibold">Sign in to get your referral link</h1>
        <p className="mt-3 text-muted-foreground">Every Spott.ca member gets a unique link. Share it and earn Featured placement.</p>
        <Link to="/auth" className="mt-6 inline-block rounded-md bg-primary px-5 py-2.5 font-medium text-primary-foreground">Sign in</Link>
      </div>
    );
  }

  const url = state.share_url ?? "";
  const copy = async () => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Referral link copied");
    setTimeout(() => setCopied(false), 1500);
  };

  const nativeShare = async () => {
    if (!url) return;
    const text = `I'm on Spott.ca — Canada's local marketplace. Sign up with my link and we both win 🎁`;
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: "Join me on Spott.ca", text, url });
      } catch {}
    } else {
      copy();
    }
  };

  const onRedeem = async (referralId: string) => {
    if (targets.length === 0) {
      toast.error("Post a listing or claim a business first to apply your Featured reward.");
      return;
    }
    const target = targets[0]; // apply to first — full picker below
    setRedeemingId(referralId);
    const r = await redeem({ data: { referral_id: referralId, target_type: target.type, target_id: target.id } });
    setRedeemingId(null);
    if (r.ok) {
      toast.success(`30 days Featured applied to "${target.label}" 🎉`);
      const fresh = await fetchMine();
      setState(fresh);
    } else {
      toast.error(`Could not redeem: ${r.reason}`);
    }
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center gap-3">
        <Gift className="h-6 w-6 text-primary" />
        <h1 className="font-display text-3xl font-semibold">Refer friends, earn Featured</h1>
      </div>
      <p className="mt-2 max-w-2xl text-muted-foreground">
        Share your link. When a friend signs up and posts their first listing, you unlock <strong>30 days of Featured placement</strong> on any listing or business you own.
      </p>

      {/* Hero card */}
      <div className="mt-8 grid gap-6 md:grid-cols-[1fr_auto]">
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">Your referral code</div>
          <div className="mt-1 font-mono text-2xl font-semibold">{state.referral_code}</div>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <code className="flex-1 truncate rounded-md bg-background px-3 py-2 text-sm">{url}</code>
            <button onClick={copy} className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-accent/10">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />} Copy
            </button>
            <button onClick={nativeShare} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground">
              <Share2 className="h-4 w-4" /> Share
            </button>
          </div>
          <div className="mt-6 grid grid-cols-4 gap-3">
            <Stat label="Total" value={state.totals.total} />
            <Stat label="Pending" value={state.totals.pending} />
            <Stat label="Qualified" value={state.totals.qualified} accent />
            <Stat label="Rewarded" value={state.totals.rewarded} />
          </div>
        </div>
        <div className="flex items-center justify-center rounded-xl border border-border bg-card p-6">
          {url ? <QRCodeSVG value={url} size={140} bgColor="transparent" fgColor="currentColor" /> : null}
        </div>
      </div>

      {/* Referrals list */}
      <div className="mt-10">
        <h2 className="font-display text-xl font-semibold">Your referrals</h2>
        {state.referrals.length === 0 ? (
          <div className="mt-4 rounded-xl border border-dashed border-border bg-card p-8 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-3 text-sm text-muted-foreground">
              No referrals yet. Share your link — you'll see friends appear here as they join.
            </p>
          </div>
        ) : (
          <div className="mt-4 divide-y divide-border rounded-xl border border-border bg-card">
            {state.referrals.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{r.referee_name}</div>
                  <div className="text-xs text-muted-foreground">
                    Joined {new Date(r.created_at).toLocaleDateString()}
                    {r.qualified_at ? ` · Posted first listing ${new Date(r.qualified_at).toLocaleDateString()}` : ""}
                  </div>
                </div>
                <StatusBadge status={r.status} />
                {r.status === "qualified" ? (
                  <button
                    onClick={() => onRedeem(r.id)}
                    disabled={redeemingId === r.id}
                    className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground disabled:opacity-60"
                  >
                    {redeemingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trophy className="h-4 w-4" />}
                    Claim 30d Featured
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* How it works */}
      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {[
          { n: 1, t: "Share your link", d: "Copy, QR, or native share to friends, group chats, socials." },
          { n: 2, t: "They sign up + post", d: "As soon as they publish their first listing you qualify." },
          { n: 3, t: "Claim 30 days Featured", d: "Apply the boost to any listing or business you own." },
        ].map((s) => (
          <div key={s.n} className="rounded-xl border border-border bg-card p-5">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">{s.n}</div>
            <div className="mt-3 font-semibold">{s.t}</div>
            <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`rounded-md border border-border py-3 text-center ${accent ? "bg-primary/5" : "bg-background"}`}>
      <div className="text-2xl font-semibold">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    pending: "bg-muted text-muted-foreground",
    qualified: "bg-primary/15 text-primary",
    rewarded: "bg-emerald-500/15 text-emerald-600",
  };
  return (
    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status] ?? styles.pending}`}>
      {status}
    </span>
  );
}
