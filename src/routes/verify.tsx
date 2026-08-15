import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { VerificationBadge } from "@/components/VerificationBadge";
import { ShieldCheck, BadgeCheck, Home, Car, Star, Crown, ArrowRight } from "lucide-react";

export const Route = createFileRoute("/verify")({
  component: VerifyPage,
  head: () => ({
    meta: [
      { title: "Get Verified on Spott.ca — Trust Badges for Canadian Businesses" },
      {
        name: "description",
        content:
          "Earn a Verified Business, Verified Dealer, Verified Realtor, Trusted Seller, or Premium Member badge on Spott.ca. Build trust with Canadian customers and stand out in search results.",
      },
      { property: "og:title", content: "Get Verified on Spott.ca" },
      {
        property: "og:description",
        content:
          "Submit your documents and unlock verification badges that build buyer trust across Spott.ca.",
      },
      { property: "og:url", content: "https://www.spott.ca/verify" },
    ],
    links: [{ rel: "canonical", href: "https://www.spott.ca/verify" }],
  }),
});

const BADGES = [
  {
    type: "verified-business" as const,
    icon: BadgeCheck,
    title: "Verified Business",
    who: "Restaurants, shops, services, cafes, salons, gyms.",
    proof: "Business license, GST/HST registration, or municipal permit.",
  },
  {
    type: "verified-dealer" as const,
    icon: Car,
    title: "Verified Dealer",
    who: "Auto, RV, powersports, and equipment dealerships.",
    proof: "OMVIC / provincial dealer licence + corporate registration.",
  },
  {
    type: "verified-realtor" as const,
    icon: Home,
    title: "Verified Realtor",
    who: "Licensed real-estate agents and brokerages.",
    proof: "Provincial real-estate licence + brokerage confirmation.",
  },
  {
    type: "trusted-seller" as const,
    icon: Star,
    title: "Trusted Seller",
    who: "Marketplace sellers with a clean track record.",
    proof: "Earned automatically after completed sales with no open disputes.",
  },
  {
    type: "premium-member" as const,
    icon: Crown,
    title: "Premium Member",
    who: "Featured businesses on a paid plan.",
    proof: "Granted while a featured / promoted subscription is active.",
  },
];

function VerifyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6">
        {/* Hero */}
        <section className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <ShieldCheck className="h-3.5 w-3.5" /> Trust & Verification
          </div>
          <h1 className="mt-4 font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
            Get verified on Spott.ca
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-base text-muted-foreground">
            Verification badges show Canadians they can trust your business. Verified profiles get more clicks,
            more leads, and priority placement in search results across Spott.ca.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              to="/business-signup"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Start verification <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/for-business"
              className="inline-flex items-center gap-2 rounded-xl border border-border px-5 py-3 text-sm font-semibold hover:bg-accent"
            >
              Why join as a business
            </Link>
          </div>
        </section>

        {/* Badges */}
        <section className="mt-16">
          <h2 className="text-center text-2xl font-semibold tracking-tight">The five Spott.ca trust badges</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {BADGES.map((b) => {
              const Icon = b.icon;
              return (
                <div key={b.type} className="rounded-2xl border border-border bg-card/60 p-5">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5 text-primary" />
                    <h3 className="font-semibold">{b.title}</h3>
                  </div>
                  <div className="mt-3">
                    <VerificationBadge type={b.type} size="md" />
                  </div>
                  <p className="mt-3 text-sm text-foreground/90">{b.who}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground/70">How to earn it:</span> {b.proof}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Process */}
        <section className="mt-16 rounded-2xl border border-border bg-card/40 p-8">
          <h2 className="text-2xl font-semibold tracking-tight">How verification works</h2>
          <ol className="mt-6 grid gap-6 md:grid-cols-3">
            {[
              { n: 1, t: "Submit your details", d: "Tell us about your business and upload one or more documents — license, incorporation, dealer permit, GST/HST registration." },
              { n: 2, t: "We review within 1–2 business days", d: "Spott's verification team checks the documents against public Canadian registries. Documents are private and only seen by reviewers." },
              { n: 3, t: "Your badge goes live", d: "Approved profiles get the right badge across search results, listings, and your business page — instantly." },
            ].map((s) => (
              <li key={s.n}>
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{s.n}</div>
                <h3 className="mt-3 font-semibold">{s.t}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Where badges appear */}
        <section className="mt-16">
          <h2 className="text-2xl font-semibold tracking-tight">Where your badge appears</h2>
          <ul className="mt-4 grid gap-3 text-sm text-foreground/90 sm:grid-cols-2">
            <li className="rounded-xl border border-border bg-card/60 p-4">
              <strong>Search results</strong> — across the directory, marketplace and vehicles search.
            </li>
            <li className="rounded-xl border border-border bg-card/60 p-4">
              <strong>Listing cards</strong> — every product, vehicle and business listing you publish.
            </li>
            <li className="rounded-xl border border-border bg-card/60 p-4">
              <strong>Your business page</strong> — featured at the top of your public Spott profile.
            </li>
            <li className="rounded-xl border border-border bg-card/60 p-4">
              <strong>Your seller profile</strong> — shoppers see the badge before they message you.
            </li>
          </ul>
        </section>

        {/* CTA */}
        <section className="mt-16 rounded-2xl bg-primary px-8 py-10 text-center text-primary-foreground">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Ready to get verified?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm opacity-90">
            Submit your documents now and start standing out across Spott.ca.
          </p>
          <Link
            to="/business-signup"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-background px-6 py-3 text-sm font-semibold text-foreground hover:bg-background/90"
          >
            Start verification <ArrowRight className="h-4 w-4" />
          </Link>
        </section>
      </main>
    </div>
  );
}
