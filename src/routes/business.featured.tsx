import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Sparkles, CheckCircle2, Clock, ArrowRight } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  FEATURED_SECTIONS,
  FEATURED_TIERS,
  myBusinessesWithFeatured,
  requestFeaturedPlacement,
} from "@/lib/featured.functions";

export const Route = createFileRoute("/business/featured")({
  component: BusinessFeaturedPage,
  head: () => ({
    meta: [
      { title: "Apply for Featured Placement — Spott.ca" },
      {
        name: "description",
        content:
          "Upgrade your Spott.ca business to a Featured placement and reach more Canadian customers across the homepage, search and city pages.",
      },
    ],
  }),
});

type Biz = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  province: string | null;
  featured_until: string | null;
  featured_tier: string | null;
  featured_sections: string[] | null;
};

type Req = {
  id: string;
  business_id: string;
  requested_tier: string;
  requested_sections: string[];
  status: string;
  admin_notes: string | null;
  created_at: string;
};

function BusinessFeaturedPage() {
  const fetchMine = useServerFn(myBusinessesWithFeatured);
  const submit = useServerFn(requestFeaturedPlacement);

  const [loading, setLoading] = useState(true);
  const [businesses, setBusinesses] = useState<Biz[]>([]);
  const [requests, setRequests] = useState<Req[]>([]);
  const [businessId, setBusinessId] = useState("");
  const [tier, setTier] = useState("featured");
  const [sections, setSections] = useState<string[]>(["businesses"]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetchMine({});
      setBusinesses(res.businesses as Biz[]);
      setRequests(res.requests as Req[]);
      if (res.businesses.length === 1) setBusinessId((res.businesses[0] as Biz).id);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not load your businesses");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const toggleSection = (v: string) => {
    setSections((s) => (s.includes(v) ? s.filter((x) => x !== v) : [...s, v]));
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessId) return toast.error("Select a business");
    if (sections.length === 0) return toast.error("Pick at least one section");
    setSubmitting(true);
    try {
      await submit({
        data: {
          business_id: businessId,
          requested_tier: tier as any,
          requested_sections: sections,
          message: message.trim() || undefined,
        },
      });
      toast.success("Application submitted — we'll review within 1-2 business days.");
      setMessage("");
      load();
    } catch (err: any) {
      toast.error(err?.message ?? "Could not submit application");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-10 sm:px-6">
        <div className="mb-8">
          <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
            <Sparkles className="h-3.5 w-3.5" /> Featured Placements
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Apply for Featured Placement
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Featured businesses appear on the Spott.ca homepage, get higher ranking in search and category pages,
            and earn a distinctive Featured badge across the platform.
          </p>
          <a
            href="/business/featured/analytics"
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
          >
            View placement analytics →
          </a>
        </div>

        {/* Status overview */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          {FEATURED_TIERS.map((t) => (
            <Card key={t.value} className="border-border">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div className="text-base font-semibold">{t.label}</div>
                  <Badge variant="secondary">${t.price}/mo</Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {t.value === "featured" && "Appear in one homepage section + priority search ranking."}
                  {t.value === "featured_plus" && "Appear in two homepage sections + city-page priority + Featured badge."}
                  {t.value === "premium_featured" && "All sections, top ranking, premium badge & profile spotlight."}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          {/* Apply form */}
          <form onSubmit={onSubmit} className="space-y-5 rounded-2xl border border-border bg-card/60 p-6">
            <h2 className="text-lg font-semibold">Submit an application</h2>

            <div>
              <Label className="text-xs">Business</Label>
              <Select value={businessId} onValueChange={setBusinessId}>
                <SelectTrigger><SelectValue placeholder={loading ? "Loading…" : "Select your business"} /></SelectTrigger>
                <SelectContent>
                  {businesses.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} {b.city ? `· ${b.city}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!loading && businesses.length === 0 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  You don't own any businesses yet.{" "}
                  <Link to="/business-signup" className="text-primary underline">Register one</Link>.
                </p>
              )}
            </div>

            <div>
              <Label className="text-xs">Requested tier</Label>
              <Select value={tier} onValueChange={setTier}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {FEATURED_TIERS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label} (${t.price}/mo)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">Homepage sections</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {FEATURED_SECTIONS.map((s) => {
                  const active = sections.includes(s.value);
                  return (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => toggleSection(s.value)}
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                        active
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <Label className="text-xs">Why should we feature your business? (optional)</Label>
              <Textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what makes your business notable, any awards, your audience, etc."
              />
            </div>

            <Button type="submit" disabled={submitting || businesses.length === 0} className="w-full">
              {submitting ? "Submitting…" : "Submit application"}
              <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
            <p className="text-[11px] text-muted-foreground">
              Billing is not enabled yet — this submits a request for review only. We'll contact you with next steps.
            </p>
          </form>

          {/* Status / history */}
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold">Current featured status</h2>
              <div className="mt-3 space-y-3">
                {loading ? (
                  <div className="rounded-xl border border-border bg-card/40 p-5 text-sm text-muted-foreground">
                    Loading…
                  </div>
                ) : businesses.length === 0 ? (
                  <div className="rounded-xl border border-border bg-card/40 p-5 text-sm text-muted-foreground">
                    No businesses yet.
                  </div>
                ) : (
                  businesses.map((b) => {
                    const isFeatured =
                      b.featured_until && new Date(b.featured_until).getTime() > Date.now();
                    return (
                      <div key={b.id} className="rounded-xl border border-border bg-card/60 p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-medium">{b.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {[b.city, b.province].filter(Boolean).join(", ") || "—"}
                            </div>
                          </div>
                          {isFeatured ? (
                            <Badge className="bg-amber-100 text-amber-700">
                              <Sparkles className="mr-1 h-3 w-3" />
                              {b.featured_tier ?? "Featured"}
                            </Badge>
                          ) : (
                            <Badge variant="outline">Not featured</Badge>
                          )}
                        </div>
                        {isFeatured && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            Expires {new Date(b.featured_until!).toLocaleDateString("en-CA")}
                            {b.featured_sections?.length ? ` · sections: ${b.featured_sections.join(", ")}` : ""}
                          </p>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div>
              <h2 className="text-lg font-semibold">Your applications</h2>
              <div className="mt-3 space-y-2">
                {requests.length === 0 ? (
                  <div className="text-xs text-muted-foreground">No applications yet.</div>
                ) : (
                  requests.map((r) => (
                    <div key={r.id} className="rounded-lg border border-border bg-card/60 p-3 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{r.requested_tier}</span>
                        {r.status === "approved" ? (
                          <Badge className="bg-emerald-100 text-emerald-700"><CheckCircle2 className="mr-1 h-3 w-3" />Approved</Badge>
                        ) : r.status === "rejected" ? (
                          <Badge variant="outline">Rejected</Badge>
                        ) : (
                          <Badge className="bg-amber-100 text-amber-700"><Clock className="mr-1 h-3 w-3" />Pending</Badge>
                        )}
                      </div>
                      <div className="mt-1 text-muted-foreground">
                        Sections: {r.requested_sections.join(", ")} · {new Date(r.created_at).toLocaleDateString("en-CA")}
                      </div>
                      {r.admin_notes && (
                        <div className="mt-1 text-foreground/80">Notes: {r.admin_notes}</div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
