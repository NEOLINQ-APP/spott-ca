import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { getClaimInvitationPreview, completeClaimInvitation } from "@/lib/claim-business.functions";
import { getProfileStrength } from "@/lib/profile-strength";
import { toast } from "sonner";
import { Loader2, MapPin, Tag, CheckCircle2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/claim-business/$token")({
  component: ClaimBusinessPage,
  head: () => ({
    meta: [
      { title: "Claim your business — Spott" },
      { name: "robots", content: "noindex,follow" },
    ],
  }),
});

type Preview = Awaited<ReturnType<typeof getClaimInvitationPreview>>;

const REASON_COPY: Record<string, string> = {
  not_found: "This claim link isn't valid.",
  already_claimed: "This business has already been claimed.",
  revoked: "This invitation is no longer active.",
  expired: "This invitation has expired — you can still claim this listing the regular way.",
};

function ClaimBusinessPage() {
  const { token } = Route.useParams();
  const navigate = useNavigate();
  const previewFn = useServerFn(getClaimInvitationPreview);
  const claimFn = useServerFn(completeClaimInvitation);

  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimed, setClaimed] = useState<{ slug: string; strength: ReturnType<typeof getProfileStrength> } | null>(null);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      setUserId(sess.session?.user?.id ?? null);
      const res = await previewFn({ data: { token } });
      setPreview(res);
      setLoading(false);
    })();
  }, [token, previewFn]);

  const onClaim = async () => {
    if (!userId) {
      navigate({ to: "/auth" });
      return;
    }
    setClaiming(true);
    try {
      const res = await claimFn({ data: { token } });
      toast.success("Congratulations! Your business is now claimed.");

      const { data: biz } = await supabase
        .from("businesses")
        .select("hero_image_url, description, phone, email, website, address, hours, category_id, keywords")
        .eq("slug", res.slug)
        .maybeSingle();
      const { count } = await supabase
        .from("business_photos")
        .select("id", { count: "exact", head: true })
        .eq("business_id", (preview && preview.valid ? preview.business.id : ""));

      const strength = getProfileStrength({
        hero_image_url: biz?.hero_image_url ?? null,
        description: biz?.description ?? null,
        phone: biz?.phone ?? null,
        email: biz?.email ?? null,
        website: biz?.website ?? null,
        address: biz?.address ?? null,
        hours: biz?.hours ?? null,
        category_id: biz?.category_id ?? null,
        keywords: biz?.keywords ?? null,
        photo_count: count ?? 0,
      });
      setClaimed({ slug: res.slug, strength });
    } catch (e: any) {
      toast.error(e?.message || "Could not claim this business");
    } finally {
      setClaiming(false);
    }
  };

  if (loading) return <div className="min-h-dvh grid place-items-center"><Loader2 className="h-6 w-6 animate-spin" /></div>;

  if (claimed) {
    return (
      <div className="min-h-dvh bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-xl px-6 py-16 text-center">
          <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
          <h1 className="mt-4 font-display text-2xl font-bold">Congratulations! Your business is now claimed.</h1>
          <p className="mt-2 text-sm text-muted-foreground">You're in control of this listing now.</p>

          <div className="mt-8 rounded-2xl border border-border bg-card p-5 text-left">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-semibold">Spott profile strength</span>
              <span className="text-sm font-semibold text-primary">{claimed.strength.pct}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
              <div className="h-full bg-primary transition-all" style={{ width: `${claimed.strength.pct}%` }} />
            </div>
            <ul className="mt-4 space-y-2">
              {claimed.strength.checklist.map((item) => (
                <li key={item.key} className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className={`h-4 w-4 ${item.done ? "text-primary" : "text-muted-foreground/30"}`} />
                  <span className={item.done ? "" : "text-muted-foreground"}>{item.label}</span>
                </li>
              ))}
            </ul>
          </div>

          <Link
            to="/business/$slug"
            params={{ slug: claimed.slug }}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
          >
            <Sparkles className="h-4 w-4" /> Finish setting up your listing
          </Link>
        </div>
      </div>
    );
  }

  if (!preview || !preview.valid) {
    return (
      <div className="min-h-dvh"><SiteHeader />
        <div className="mx-auto max-w-lg px-6 py-16 text-center text-sm text-muted-foreground">
          {preview ? REASON_COPY[preview.reason] ?? "This claim link isn't valid." : "This claim link isn't valid."}
          <div className="mt-4"><Link to="/browse" className="text-primary hover:underline">Browse Spott</Link></div>
        </div>
      </div>
    );
  }

  const biz = preview.business;

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-2xl px-6 py-12">
        <p className="text-sm font-medium text-primary">Your business is already on Spott.</p>
        <h1 className="mt-2 font-display text-3xl font-bold">Welcome, {biz.name}</h1>
        <p className="mt-1 text-muted-foreground">Your Spott listing is ready.</p>

        <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-card">
          {biz.hero_image_url && <img src={biz.hero_image_url} alt={biz.name} className="aspect-[16/7] w-full object-cover" />}
          <div className="p-5">
            <h2 className="font-display text-xl font-semibold">{biz.name}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
              {biz.category && <span className="inline-flex items-center gap-1"><Tag className="h-3.5 w-3.5" /> {biz.category}</span>}
              {(biz.city || biz.province) && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {[biz.city, biz.province].filter(Boolean).join(", ")}</span>}
            </div>
            {biz.description && <p className="mt-3 text-sm text-foreground/90 whitespace-pre-line">{biz.description}</p>}
          </div>
        </div>

        <div className="mt-8 flex flex-col items-center gap-3">
          <button
            onClick={onClaim}
            disabled={claiming}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {claiming && <Loader2 className="h-4 w-4 animate-spin" />} Claim my business
          </button>
          {!userId && <p className="text-xs text-muted-foreground">You'll be asked to sign in or create an account first.</p>}
          <Link to="/browse" className="text-xs text-muted-foreground hover:text-foreground">Is this not your business?</Link>
        </div>
      </div>
    </div>
  );
}
