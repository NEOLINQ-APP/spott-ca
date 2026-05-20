import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { SiteHeader } from "@/components/site-header";
import { getCustomerDashboard, getOwnerDashboard, replyToReview } from "@/lib/social.functions";
import { Star, Heart, Eye, Store, MessageSquare, Loader2, Crown, ExternalLink, Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { createPortalSession, changeSubscriptionPlan } from "@/utils/payments.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { BoostPanel } from "@/components/BoostPanel";
import { SpecialsManager } from "@/components/SpecialsManager";
import { MessagesPanel } from "@/components/MessagesPanel";
import { BookingEditor } from "@/components/BookingEditor";

export const Route = createFileRoute("/dashboard")({
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: DashboardPage,
});

function DashboardPage() {
  const fetchCustomer = useServerFn(getCustomerDashboard);
  const fetchOwner = useServerFn(getOwnerDashboard);
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
        <h1 className="font-display text-3xl font-semibold tracking-tight">Dashboard</h1>
        <SubscriptionPanel />
        <RecentSearches />
        {loading ? (
          <div className="mt-10 h-64 animate-pulse rounded-2xl bg-card/60" />
        ) : (
          <Tabs defaultValue={hasOwnerListings ? "owner" : "customer"} className="mt-6">
            <TabsList>
              <TabsTrigger value="customer">My activity</TabsTrigger>
              <TabsTrigger value="owner">My listings</TabsTrigger>
            </TabsList>

            <TabsContent value="customer" className="mt-6 space-y-8">
              <CustomerView data={customer} />
              <MessagesPanel role="customer" />
            </TabsContent>

            <TabsContent value="owner" className="mt-6 space-y-8">
              <OwnerView data={owner} onChange={reload} />
              {hasOwnerListings && <MessagesPanel role="owner" />}
            </TabsContent>
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
        <h2 className="mb-3 font-display text-lg font-semibold">Your listings</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {data.businesses.map((b: any) => {
            const reviews = data.reviews.filter((r: any) => r.business_id === b.id);
            const avg = reviews.length ? reviews.reduce((s: number, r: any) => s + r.rating, 0) / reviews.length : 0;
            return (
              <Link key={b.id} to="/business/$slug" params={{ slug: b.slug }}
                className="block rounded-xl border border-border bg-card p-4 hover:border-primary/40">
                <div className="flex items-start justify-between gap-2">
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
            );
          })}
        </div>
      </section>

      {data.businesses.map((b: any) => (
        <div key={`boost-${b.id}`} className="space-y-4">
          <BoostPanel businessId={b.id} ownerId={b.owner_id ?? ""} />
          <BookingEditor businessId={b.id} />
          <SpecialsManager businessId={b.id} businessName={b.name} />
        </div>
      ))}


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
