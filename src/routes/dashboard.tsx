import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { getCustomerDashboard, getOwnerDashboard, replyToReview, deleteBusiness } from "@/lib/social.functions";
import { Star, Heart, Eye, Store, MessageSquare, Loader2, Crown, ExternalLink, Search, Trash2 } from "lucide-react";
import { TIER_LIMITS } from "@/lib/entitlements";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { createPortalSession, changeSubscriptionPlan } from "@/utils/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { BoostPanel } from "@/components/BoostPanel";
import { SpecialsManager } from "@/components/SpecialsManager";
import { MessagesPanel } from "@/components/MessagesPanel";
import { BookingEditor } from "@/components/BookingEditor";
import { AddonHistoryPanel } from "@/components/AddonHistoryPanel";
import { BookingStatsPanel } from "@/components/BookingStatsPanel";
import { ReferralPanel } from "@/components/ReferralPanel";
import { AvatarUpload } from "@/components/AvatarUpload";
import { ManageBusinessPhotos } from "@/components/ManageBusinessPhotos";
import { SavedSearchesPanel } from "@/components/SavedSearchesPanel";
import { SuggestedForYouPanel } from "@/components/SuggestedForYouPanel";
import { FriendsPanel } from "@/components/FriendsPanel";
import { useRoles } from "@/hooks/use-roles";


export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: DashboardPage,
  head: () => ({
    meta: [
      { title: "Your dashboard — Spott.ca" },
      { name: "description", content: "Manage your Spott.ca listings, reviews, messages, subscriptions, and boosts." },
      { property: "og:title", content: "Dashboard — Spott.ca" },
      { property: "og:description", content: "Your personal Spott.ca dashboard." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

function DashboardPage() {
  const fetchCustomer = useServerFn(getCustomerDashboard);
  const fetchOwner = useServerFn(getOwnerDashboard);
  const { isAdmin } = useRoles();
  const [customer, setCustomer] = useState<any>(null);
  const [owner, setOwner] = useState<any>(null);
  const [loading, setLoading] = useState(true);


  const reload = async () => {
    const [c, o] = await Promise.all([fetchCustomer({}), fetchOwner({})]);
    setCustomer(c);
    setOwner(o);
    setLoading(false);
  };
  useEffect(() => { reload(); }, []);

  const hasOwnerListings = (owner?.businesses?.length ?? 0) > 0;

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {isAdmin ? "Admin Dashboard" : "Dashboard"}
        </h1>
        {isAdmin && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Crown className="h-3.5 w-3.5" /> Admin access
          </div>
        )}

        <div className="mt-6"><AvatarUpload /></div>
        <SuggestedForYouPanel />
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <SavedSearchesPanel />
          <RecentSearches />
        </div>
        {loading ? (
          <div className="mt-10 h-64 animate-pulse rounded-2xl bg-card/60" />
        ) : (
          <Tabs defaultValue={isAdmin ? "admin" : (hasOwnerListings ? "owner" : "customer")} className="mt-6">
            <TabsList>
              <TabsTrigger value="customer">My activity</TabsTrigger>
              <TabsTrigger value="owner">My listings</TabsTrigger>
              {isAdmin && <TabsTrigger value="admin">Admin</TabsTrigger>}
            </TabsList>

            <TabsContent value="customer" className="mt-6 space-y-8">
              <CustomerView data={customer} />
              <FriendsPanel />
              <MessagesPanel role="customer" />
            </TabsContent>

            <TabsContent value="owner" className="mt-6 space-y-8">
              <OwnerView data={owner} onChange={reload} />
              {hasOwnerListings && <MessagesPanel role="owner" />}
            </TabsContent>

            {isAdmin && (
              <TabsContent value="admin" className="mt-6 space-y-8">
                <AdminPanel />
              </TabsContent>
            )}
          </Tabs>

        )}
      </main>
    </div>
  );
}

function SubscriptionPanel() {
  const { tier, isActive, sub, loading } = useSubscription();
  const portal = useServerFn(createPortalSession);
  const [opening, setOpening] = useState(false);
  const openPortal = async () => {
    setOpening(true);
    try {
      const url = await portal({ data: { environment: getStripeEnvironment(), returnUrl: `${window.location.origin}/dashboard` } });
      if (url) window.open(url, "_blank");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not open billing portal");
    } finally { setOpening(false); }
  };
  if (loading) return null;
  return (
    <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div className={`grid h-10 w-10 place-items-center rounded-full ${tier === "free" ? "bg-secondary" : "bg-primary/15 text-primary"}`}>
          <Crown className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-medium">
            Current plan: <span className="capitalize">{tier}</span>
            {sub?.cancel_at_period_end && <span className="ml-2 text-xs text-yellow-600">(cancels at period end)</span>}
          </div>
          <div className="text-xs text-muted-foreground">
            {tier === "free" ? "Upgrade to unlock more photos, bump-ups, and specials." :
             sub?.current_period_end ? `Renews ${new Date(sub.current_period_end).toLocaleDateString()}` : "Active"}
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        {isActive && (
          <button onClick={openPortal} disabled={opening}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs hover:bg-accent/10 disabled:opacity-50">
            {opening ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />} Manage billing
          </button>
        )}
        <Link to="/pricing" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
          {tier === "free" ? "See plans" : "Change plan"}
        </Link>
      </div>
    </div>
  );
}

function RecentSearches() {
  const [items, setItems] = useState<{ id: string; query: string; created_at: string }[]>([]);
  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id;
      if (!uid) return;
      const { data } = await supabase
        .from("search_history")
        .select("id,query,created_at")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(8);
      setItems((data ?? []) as any);
    })();
  }, []);
  if (items.length === 0) return null;
  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-4">
      <div className="mb-2 flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <Search className="h-3.5 w-3.5" /> Recent searches
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((s) => (
          <Link key={s.id} to="/browse" search={{ q: s.query } as any}
            className="rounded-full border border-border bg-background px-3 py-1 text-xs hover:border-primary/40 hover:text-primary">
            {s.query}
          </Link>
        ))}
      </div>
    </div>
  );
}

function CustomerView({ data }: { data: any }) {
  if (!data) return null;
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <Card title="Reviews you wrote" icon={<Star className="h-4 w-4" />} empty={data.reviews.length === 0}>
        {data.reviews.map((r: any) => (
          <Row key={r.id}
            title={r.businesses?.name ?? "Business"}
            href={r.businesses?.slug ? `/business/${r.businesses.slug}` : undefined}
            meta={`${r.rating}★ · ${new Date(r.created_at).toLocaleDateString()}`}
            body={r.body}
          />
        ))}
      </Card>
      <Card title="Following" icon={<Store className="h-4 w-4" />} empty={data.follows.length === 0}>
        {data.follows.map((f: any) => (
          <Row key={f.businesses?.id}
            title={f.businesses?.name}
            href={f.businesses?.slug ? `/business/${f.businesses.slug}` : undefined}
            meta={[f.businesses?.city, f.businesses?.province].filter(Boolean).join(", ")}
          />
        ))}
      </Card>
      <Card title="Recently viewed" icon={<Eye className="h-4 w-4" />} empty={data.views.length === 0}>
        {data.views.map((v: any, i: number) => (
          <Row key={i}
            title={v.businesses?.name}
            href={v.businesses?.slug ? `/business/${v.businesses.slug}` : undefined}
            meta={new Date(v.viewed_at).toLocaleString()}
          />
        ))}
      </Card>
      <Card title="Reviews you liked" icon={<Heart className="h-4 w-4" />} empty={data.likes.length === 0}>
        {data.likes.map((l: any, i: number) => (
          <Row key={i}
            title={l.reviews?.businesses?.name ?? "Review"}
            href={l.reviews?.businesses?.slug ? `/business/${l.reviews.businesses.slug}` : undefined}
            meta={`${l.reviews?.rating ?? ""}★`}
            body={l.reviews?.body}
          />
        ))}
      </Card>
    </div>
  );
}

function OwnerView({ data, onChange }: { data: any; onChange: () => void }) {
  const { tier } = useSubscription();
  const photoCap = TIER_LIMITS[tier]?.photoCap ?? TIER_LIMITS.free.photoCap;
  const removeBiz = useServerFn(deleteBusiness);
  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?\n\nThis permanently removes the listing, its photos, reviews, specials, and followers. This cannot be undone.`)) return;
    try {
      await removeBiz({ data: { business_id: id } });
      toast.success("Listing deleted");
      onChange();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not delete");
    }
  };
  if (!data) return null;
  if (!data.businesses.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
        <p className="text-sm text-muted-foreground">You don't own any listings yet.</p>
        <Link to="/new-listing" className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          + Create your first listing
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Your listings</h2>
          <Link
            to="/new-listing"
            className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
          >
            + Add another listing
          </Link>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.businesses.map((b: any) => {
            const reviews = data.reviews.filter((r: any) => r.business_id === b.id);
            const avg = reviews.length ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length : 0;
            return (
              <div key={b.id} className="relative rounded-xl border border-border bg-card p-4 hover:border-primary/40">
                <Link to="/business/$slug" params={{ slug: b.slug }} className="block">
                  <div className="flex items-start justify-between gap-2 pr-7">
                    <div>
                      <div className="font-medium">{b.name}</div>
                      <div className="text-xs text-muted-foreground">{[b.city, b.province].filter(Boolean).join(", ")}</div>
                    </div>
                    <StatusBadge status={b.status} />
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span>{reviews.length} review{reviews.length === 1 ? "" : "s"}{reviews.length ? ` · ${avg.toFixed(1)}★` : ""}</span>
                    <span>{data.followCounts[b.id] ?? 0} followers</span>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => handleDelete(b.id, b.name)}
                  title="Delete listing"
                  className="absolute right-2 top-2 rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      </section>

      {data.businesses.map((b: any) => (
        <div key={`boost-${b.id}`} className="space-y-4">
          <ManageBusinessPhotos businessId={b.id} businessName={b.name} initialHero={b.hero_image_url ?? null} maxPhotos={photoCap} />
          <BoostPanel businessId={b.id} ownerId={b.owner_id ?? ""} />
          <BookingEditor businessId={b.id} />
          <BookingStatsPanel businessId={b.id} businessName={b.name} />
          <SpecialsManager businessId={b.id} businessName={b.name} />
          {b.is_claimed && <ReferralPanel businessId={b.id} businessName={b.name} referralCode={b.referral_code ?? null} />}
        </div>
      ))}

      <AddonHistoryPanel businessIds={data.businesses.map((b: any) => b.id)} />


      <section>
        <h2 className="mb-3 font-display text-lg font-semibold">Reviews on your businesses</h2>
        {data.reviews.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/40 p-6 text-center text-sm text-muted-foreground">
            No reviews yet.
          </div>
        ) : (
          <ul className="space-y-3">
            {data.reviews.map((r: any) => {
              const biz = data.businesses.find((b: any) => b.id === r.business_id);
              return <ReviewItem key={r.id} review={r} bizName={biz?.name ?? ""} onReplied={onChange} />;
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function ReviewItem({ review, bizName, onReplied }: { review: any; bizName: string; onReplied: () => void }) {
  const reply = useServerFn(replyToReview);
  const [text, setText] = useState(review.owner_reply ?? "");
  const [editing, setEditing] = useState(!review.owner_reply);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (text.trim().length < 1) return;
    setSaving(true);
    try {
      await reply({ data: { review_id: review.id, reply: text.trim() } });
      toast.success("Reply posted");
      setEditing(false);
      onReplied();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not reply");
    } finally { setSaving(false); }
  };

  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span><strong className="text-foreground">{review.profiles?.display_name ?? "Reviewer"}</strong> on {bizName}</span>
        <span>{review.rating}★ · {new Date(review.created_at).toLocaleDateString()}</span>
      </div>
      <p className="mt-2 text-sm">{review.body}</p>
      <div className="mt-3 rounded-md border border-border/60 bg-background/50 p-3">
        <div className="mb-1 text-xs font-medium text-muted-foreground flex items-center gap-1.5">
          <MessageSquare className="h-3.5 w-3.5" /> Owner reply
        </div>
        {editing ? (
          <>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2}
              className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm" placeholder="Thank the reviewer or respond…" />
            <div className="mt-2 flex justify-end gap-2">
              {review.owner_reply && (
                <button onClick={() => { setText(review.owner_reply); setEditing(false); }}
                  className="text-xs text-muted-foreground hover:text-foreground">Cancel</button>
              )}
              <button onClick={submit} disabled={saving}
                className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
                {saving && <Loader2 className="h-3 w-3 animate-spin" />} {review.owner_reply ? "Update" : "Reply"}
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm">{review.owner_reply}</p>
            <button onClick={() => setEditing(true)} className="shrink-0 text-xs text-primary hover:underline">Edit</button>
          </div>
        )}
      </div>
    </li>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    approved: "bg-green-500/15 text-green-600 dark:text-green-400",
    pending: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
    rejected: "bg-red-500/15 text-red-600 dark:text-red-400",
  };
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${map[status] ?? "bg-muted text-muted-foreground"}`}>{status}</span>;
}

function Card({ title, icon, empty, children }: { title: string; icon: React.ReactNode; empty: boolean; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-3 flex items-center gap-2 text-sm font-medium">{icon} {title}</div>
      {empty ? (
        <div className="rounded-md border border-dashed border-border bg-background/40 p-4 text-center text-xs text-muted-foreground">Nothing here yet.</div>
      ) : (
        <ul className="space-y-2">{children}</ul>
      )}
    </div>
  );
}

function Row({ title, meta, body, href }: { title?: string; meta?: string; body?: string; href?: string }) {
  const inner = (
    <div className="rounded-md border border-border/60 bg-background/50 p-3 transition hover:border-primary/40">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-medium truncate">{title || "—"}</span>
        {meta && <span className="shrink-0 text-xs text-muted-foreground">{meta}</span>}
      </div>
      {body && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{body}</p>}
    </div>
  );
  return href ? <li><a href={href}>{inner}</a></li> : <li>{inner}</li>;
}

function AdminPanel() {
  const [stats, setStats] = useState<{ total: number; pending: number; approved: number; claims: number; users: number } | null>(null);
  const [pendingBiz, setPendingBiz] = useState<any[]>([]);
  const [pendingClaims, setPendingClaims] = useState<any[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const [{ count: total }, { count: pending }, { count: approved }, { count: claims }, { count: users }, biz, claimRows] = await Promise.all([
      supabase.from("businesses").select("id", { count: "exact", head: true }),
      supabase.from("businesses").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("businesses").select("id", { count: "exact", head: true }).eq("status", "approved"),
      supabase.from("business_claims").select("id", { count: "exact", head: true }).eq("status", "pending"),
      supabase.from("profiles").select("id", { count: "exact", head: true }),
      supabase.from("businesses").select("id,name,slug,city,province,created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(20),
      supabase.from("business_claims").select("id,business_id,claimant_email,claimant_role,created_at,businesses:business_id(name,slug)").eq("status", "pending").order("created_at", { ascending: false }).limit(20),
    ]);
    setStats({ total: total ?? 0, pending: pending ?? 0, approved: approved ?? 0, claims: claims ?? 0, users: users ?? 0 });
    setPendingBiz(biz.data ?? []);
    setPendingClaims((claimRows.data ?? []) as any);
  };
  useEffect(() => { load(); }, []);

  const setBizStatus = async (id: string, status: "approved" | "rejected") => {
    setBusy(id);
    const { error } = await supabase.from("businesses").update({ status }).eq("id", id);
    if (error) toast.error(error.message); else { toast.success(`Listing ${status}`); await load(); }
    setBusy(null);
  };
  const setClaimStatus = async (id: string, business_id: string, status: "approved" | "rejected") => {
    setBusy(id);
    const { error } = await supabase.from("business_claims").update({ status, reviewed_at: new Date().toISOString() }).eq("id", id);
    if (!error && status === "approved") {
      await supabase.from("businesses").update({ is_claimed: true }).eq("id", business_id);
    }
    if (error) toast.error(error.message); else { toast.success(`Claim ${status}`); await load(); }
    setBusy(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <div className="text-sm font-medium">Admin tools</div>
            <div className="text-xs text-muted-foreground">Create listings on behalf of a business, approve pending submissions, and manage claims.</div>
          </div>
        </div>
        <Link
          to="/new-listing"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          + Add a business listing
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {stats && [
          ["Listings", stats.total],
          ["Pending", stats.pending],
          ["Approved", stats.approved],
          ["Claims open", stats.claims],
          ["Users", stats.users],
        ].map(([label, val]) => (
          <div key={label as string} className="rounded-2xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">{label}</div>
            <div className="mt-1 text-2xl font-semibold">{val as number}</div>
          </div>
        ))}
      </div>

      <RevenuePanel />


      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="font-display text-lg font-semibold">Listings awaiting approval</h3>
        {pendingBiz.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No pending listings.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {pendingBiz.map((b) => (
              <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-background/40 p-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{b.name}</div>
                  <div className="text-xs text-muted-foreground">{b.city}, {b.province} · {new Date(b.created_at).toLocaleDateString()}</div>
                </div>
                <div className="flex gap-2">
                  <Link to="/business/$slug" params={{ slug: b.slug }} className="rounded-md border border-border px-3 py-1 text-xs hover:bg-accent/10">View</Link>
                  <button disabled={busy === b.id} onClick={() => setBizStatus(b.id, "approved")} className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">Approve</button>
                  <button disabled={busy === b.id} onClick={() => setBizStatus(b.id, "rejected")} className="rounded-md border border-destructive/50 px-3 py-1 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50">Reject</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="font-display text-lg font-semibold">Pending business claims</h3>
        {pendingClaims.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No pending claims.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {pendingClaims.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 bg-background/40 p-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{c.businesses?.name ?? "Business"}</div>
                  <div className="text-xs text-muted-foreground">{c.claimant_email} · {c.claimant_role ?? "—"} · {new Date(c.created_at).toLocaleDateString()}</div>
                </div>
                <div className="flex gap-2">
                  <button disabled={busy === c.id} onClick={() => setClaimStatus(c.id, c.business_id, "approved")} className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">Approve</button>
                  <button disabled={busy === c.id} onClick={() => setClaimStatus(c.id, c.business_id, "rejected")} className="rounded-md border border-destructive/50 px-3 py-1 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-50">Reject</button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function RevenuePanel() {
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 6 * 86400_000).toISOString().slice(0, 10);
  const [from, setFrom] = useState(weekAgo);
  const [to, setTo] = useState(today);
  const [rows, setRows] = useState<{ amount_cents: number | null; currency: string | null; applied_at: string | null; created_at: string }[]>([]);
  const [allTime, setAllTime] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const fromIso = new Date(from + "T00:00:00").toISOString();
    const toIso = new Date(to + "T23:59:59").toISOString();
    const [range, total] = await Promise.all([
      supabase.from("addon_purchases")
        .select("amount_cents,currency,applied_at,created_at")
        .eq("status", "completed")
        .gte("created_at", fromIso)
        .lte("created_at", toIso)
        .order("created_at", { ascending: false }),
      supabase.from("addon_purchases")
        .select("amount_cents")
        .eq("status", "completed"),
    ]);
    setRows((range.data ?? []) as any);
    setAllTime(((total.data ?? []) as any[]).reduce((s, r) => s + (r.amount_cents ?? 0), 0));
    setLoading(false);
  };
  useEffect(() => { load(); }, [from, to]);

  const totalCents = rows.reduce((s, r) => s + (r.amount_cents ?? 0), 0);
  const todayCents = rows
    .filter((r) => (r.created_at ?? "").slice(0, 10) === today)
    .reduce((s, r) => s + (r.amount_cents ?? 0), 0);

  // Daily breakdown
  const byDay = new Map<string, number>();
  for (const r of rows) {
    const d = (r.created_at ?? "").slice(0, 10);
    byDay.set(d, (byDay.get(d) ?? 0) + (r.amount_cents ?? 0));
  }
  const days = Array.from(byDay.entries()).sort((a, b) => (a[0] < b[0] ? 1 : -1));
  const fmt = (cents: number) => `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold">Revenue</h3>
          <p className="text-xs text-muted-foreground">Totals from completed add-on purchases.</p>
        </div>
        <div className="flex items-end gap-2">
          <label className="block text-xs">
            <span className="mb-1 block text-muted-foreground">From</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} max={to}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs" />
          </label>
          <label className="block text-xs">
            <span className="mb-1 block text-muted-foreground">To</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} min={from} max={today}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs" />
          </label>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Today" value={fmt(todayCents)} />
        <Stat label="Range total" value={fmt(totalCents)} />
        <Stat label="Transactions" value={String(rows.length)} />
        <Stat label="All-time" value={fmt(allTime)} />
      </div>

      <div className="mt-4 overflow-hidden rounded-lg border border-border/60">
        <table className="w-full text-xs">
          <thead className="bg-background/40 text-muted-foreground">
            <tr><th className="px-3 py-2 text-left font-medium">Day</th><th className="px-3 py-2 text-right font-medium">Revenue</th></tr>
          </thead>
          <tbody>
            {loading && <tr><td colSpan={2} className="px-3 py-4 text-center text-muted-foreground">Loading…</td></tr>}
            {!loading && days.length === 0 && <tr><td colSpan={2} className="px-3 py-4 text-center text-muted-foreground">No revenue in this range.</td></tr>}
            {days.map(([d, cents]) => (
              <tr key={d} className="border-t border-border/60">
                <td className="px-3 py-1.5">{d}</td>
                <td className="px-3 py-1.5 text-right font-medium">{fmt(cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-background/40 p-3">
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold">{value}</div>
    </div>
  );
}


