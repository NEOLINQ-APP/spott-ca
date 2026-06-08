import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { WhyBusinessesHomeSection } from "@/components/WhyBusinessesHomeSection";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowRight,
  Check,
  ChevronDown,
  Sparkles,
  Crown,
  Rocket,
  Star,
  Utensils,
  Scissors,
  Wrench,
  Car,
  Home,
  Briefcase,
  HeartPulse,
  GraduationCap,
  ShoppingBag,
  Hammer,
  Mic2,
  CalendarDays,
  Building2,
  ShieldCheck,
  Trophy,
} from "lucide-react";

const META_TITLE =
  "Why Businesses Choose Spott.ca | List Your Canadian Business";
const META_DESC =
  "Grow your business with Spott.ca — Canada's modern business directory and marketplace. Verified profiles, local discovery, modern tools, Founding Member pricing for life.";
const URL = "https://spott.ca/for-business";

export const Route = createFileRoute("/for-business")({
  head: () => ({
    meta: [
      { title: META_TITLE },
      { name: "description", content: META_DESC },
      {
        name: "keywords",
        content:
          "list a business Canada, Canadian business directory, advertise local business Canada, business listings Canada, Canadian marketplace for businesses",
      },
      { property: "og:title", content: META_TITLE },
      { property: "og:description", content: META_DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: URL },
      { property: "og:site_name", content: "Spott.ca" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: META_TITLE },
      { name: "twitter:description", content: META_DESC },
    ],
    links: [{ rel: "canonical", href: URL }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: META_TITLE,
          url: URL,
          description: META_DESC,
          inLanguage: "en-CA",
          isPartOf: { "@type": "WebSite", name: "Spott.ca", url: "https://spott.ca" },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://spott.ca/" },
            { "@type": "ListItem", position: 2, name: "For Business", item: URL },
          ],
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: FAQS.map((f) => ({
            "@type": "Question",
            name: f.q,
            acceptedAnswer: { "@type": "Answer", text: f.a },
          })),
        }),
      },
    ],
  }),
  component: ForBusinessPage,
});

const CATEGORIES = [
  { icon: Utensils, name: "Restaurants & Cafés" },
  { icon: Scissors, name: "Salons & Spas" },
  { icon: Wrench, name: "Auto Services & Mechanics" },
  { icon: Car, name: "Dealerships" },
  { icon: Home, name: "Real Estate & Realtors" },
  { icon: Hammer, name: "Trades & Contractors" },
  { icon: HeartPulse, name: "Health & Wellness" },
  { icon: GraduationCap, name: "Education & Tutoring" },
  { icon: ShoppingBag, name: "Retail & Boutiques" },
  { icon: Briefcase, name: "Professional Services" },
  { icon: Mic2, name: "Creators & Podcasters" },
  { icon: CalendarDays, name: "Event Organizers" },
];

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    blurb: "Get listed on Canada's modern business directory.",
    features: ["Basic profile", "Contact info", "Photos", "Business description"],
    cta: "Get started free",
    icon: Star,
    href: "/business/new",
  },
  {
    name: "Featured Business",
    price: "$19",
    period: "/ month",
    futurePrice: "Future: $29–$39 / mo",
    blurb: "Stand out and get seen by more local customers.",
    features: [
      "Everything in Free",
      "Featured placement",
      "Priority search ranking",
      "Featured badge",
    ],
    cta: "Start 90-day free trial",
    icon: Sparkles,
    highlight: true,
    href: "/pricing",
  },
  {
    name: "Business Pro",
    price: "$49",
    period: "/ month",
    futurePrice: "Future: $79–$99 / mo",
    blurb: "Built for growing Canadian businesses.",
    features: [
      "Everything in Featured",
      "Advanced analytics",
      "Videos on your profile",
      "Promotions & events",
      "Lead tracking",
    ],
    cta: "Start 90-day free trial",
    icon: Crown,
    href: "/pricing",
  },
  {
    name: "Enterprise",
    price: "$149",
    period: "/ month",
    futurePrice: "Future: $249–$499 / mo",
    blurb: "For multi-location brands, franchises and large operators.",
    features: [
      "Everything in Business Pro",
      "Multiple locations",
      "Advanced marketing tools",
      "Premium placement",
      "Dedicated support",
    ],
    cta: "Talk to sales",
    icon: Rocket,
    href: "/contact",
  },
];

const FAQS = [
  {
    q: "How much does it cost to list my business on Spott.ca?",
    a: "Listing your business is free. Paid plans (Featured, Pro, Enterprise) unlock placement, analytics, promotions, and growth tools. Founding Members get 90 days free and keep their introductory pricing for life.",
  },
  {
    q: "Who is Spott.ca for?",
    a: "Spott.ca is for any Canadian business — restaurants, salons, mechanics, dealerships, realtors, trades, retailers, professional services, creators, podcasters, and event organizers.",
  },
  {
    q: "What is the Founding Member Program?",
    a: "Founding Members are early Canadian businesses who join Spott.ca during launch. They receive 90 days free on any paid plan and keep their introductory pricing for life — even as our pricing grows.",
  },
  {
    q: "How is Spott.ca different from other business directories?",
    a: "Spott.ca is proudly Canadian — built in Canada, focused on Canadian cities, and designed to support local businesses. We combine a verified business directory with a real Canadian marketplace, modern tools, and direct customer messaging.",
  },
  {
    q: "Can I claim an existing listing for my business?",
    a: "Yes. If your business is already on Spott.ca, you can claim it from the listing page to take ownership, update details, respond to reviews, and unlock business features.",
  },
  {
    q: "Do I need a credit card to sign up?",
    a: "No credit card is required to create your free business listing. A card is only needed if you start a paid plan trial.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. All paid plans are month-to-month. You can cancel anytime, and Founding Member pricing stays locked in for the life of your account.",
  },
];

function ForBusinessPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="border-b border-border bg-gradient-to-br from-primary/10 via-card/40 to-background">
          <div className="mx-auto max-w-5xl px-4 py-16 text-center sm:px-6 lg:py-24">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Trophy className="h-3.5 w-3.5" /> Founding Member pricing — Limited time
            </div>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Grow your business with Canada's modern marketplace
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Spott.ca helps Canadian businesses get discovered, build trust, and win local
              customers — all in one proudly Canadian platform. List your business in minutes
              and reach buyers actively searching in your city.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/business/new">
                  List your business — free <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/pricing">See pricing & plans</Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link to="/auth">Create account</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Free to start · No credit card required · Cancel anytime
            </p>
          </div>
        </section>

        {/* Benefits grid (shared with homepage) */}
        <WhyBusinessesHomeSection />

        {/* Detailed value */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                What you get with a Spott.ca business profile
              </h2>
              <p className="mt-3 text-muted-foreground">
                Everything Canadian businesses need to be found, trusted, and chosen.
              </p>
            </div>
            <div className="mt-10 grid gap-5 md:grid-cols-2">
              {[
                {
                  title: "A modern, mobile-first profile",
                  body: "Showcase your photos, hours, services, menus, inventory, promotions, and events on a beautiful profile built for how Canadians actually browse.",
                },
                {
                  title: "Verification badges that build trust",
                  body: "Verified Business, Verified Dealer, Verified Realtor, Trusted Seller, and Premium Member badges signal credibility to every visitor.",
                },
                {
                  title: "Direct messaging with customers",
                  body: "Talk to buyers and leads in-platform. No phone tag, no third-party fees, no algorithmic gatekeepers between you and your customers.",
                },
                {
                  title: "Local search built for Canadian cities",
                  body: "Get found by Canadians searching for what you offer — across categories, neighbourhoods, provinces, and territories.",
                },
                {
                  title: "Real reviews from real Canadians",
                  body: "Verified reviewer signals and owner replies help you build a reputation that actually means something.",
                },
                {
                  title: "Analytics, leads & growth tools",
                  body: "Track profile views, search impressions, leads, and engagement so you can grow with data — not guesses.",
                },
              ].map((b) => (
                <Card key={b.title} className="h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Check className="h-5 w-5 text-primary" /> {b.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">{b.body}</CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Categories */}
        <section className="border-b border-border bg-card/30">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Built for every kind of Canadian business
              </h2>
              <p className="mt-3 text-muted-foreground">
                From neighbourhood favourites to multi-location brands — Spott.ca supports the
                full range of Canadian businesses, services, and creators.
              </p>
            </div>
            <div className="mt-10 grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {CATEGORIES.map(({ icon: Icon, name }) => (
                <div
                  key={name}
                  className="flex items-center gap-3 rounded-xl border border-border bg-background/60 p-4 transition hover:border-primary/40"
                >
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-medium">{name}</span>
                </div>
              ))}
            </div>
            <p className="mt-6 text-center text-xs text-muted-foreground">
              Don't see your category? Spott.ca welcomes every kind of Canadian business.
            </p>
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="border-b border-border">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Simple, honest pricing for Canadian businesses
              </h2>
              <p className="mt-3 text-muted-foreground">
                Start free, upgrade anytime. Founding Members keep their introductory pricing
                for life.
              </p>
            </div>

            <div className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
              {PLANS.map((p) => {
                const Icon = p.icon;
                return (
                  <div
                    key={p.name}
                    className={`flex h-full flex-col rounded-2xl border p-6 ${
                      p.highlight
                        ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                        : "border-border bg-card/60"
                    }`}
                  >
                    {p.highlight && (
                      <div className="mb-3 inline-flex w-fit items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary-foreground">
                        Most popular
                      </div>
                    )}
                    <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="text-lg font-semibold">{p.name}</h3>
                    <div className="mt-2 flex items-baseline gap-1">
                      <span className="text-3xl font-bold">{p.price}</span>
                      <span className="text-sm text-muted-foreground">{p.period}</span>
                    </div>
                    {p.futurePrice && (
                      <div className="mt-1 text-xs text-muted-foreground">{p.futurePrice}</div>
                    )}
                    <p className="mt-2 text-sm text-muted-foreground">{p.blurb}</p>
                    <ul className="mt-4 space-y-2 text-sm">
                      {p.features.map((f) => (
                        <li key={f} className="flex gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-6">
                      <Button asChild className="w-full" variant={p.highlight ? "default" : "outline"}>
                        <Link to={p.href}>{p.cta}</Link>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 text-center">
              <Button asChild variant="link">
                <Link to="/pricing">View full pricing details →</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Founding Member Program */}
        <section className="border-b border-border bg-gradient-to-br from-primary/15 via-primary/5 to-background">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6">
            <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
              <div>
                <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                  <Trophy className="h-3.5 w-3.5" /> Founding Member Program
                </div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Join early. Lock in your pricing for life.
                </h2>
                <p className="mt-3 text-muted-foreground">
                  Spott.ca is in its founding chapter — and we're rewarding the Canadian
                  businesses who help build it. Founding Members get 90 days free on any paid
                  plan and keep their introductory pricing for the life of their account, even
                  as Spott.ca grows and standard pricing increases.
                </p>
                <ul className="mt-5 space-y-2 text-sm">
                  {[
                    "90 days free on any paid plan",
                    "Introductory pricing locked in for life",
                    "Founding Member badge on your profile",
                    "Priority support during launch",
                    "Direct input into the Spott.ca roadmap",
                  ].map((f) => (
                    <li key={f} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Button asChild size="lg">
                    <Link to="/business/new">Become a Founding Member</Link>
                  </Button>
                  <Button asChild size="lg" variant="outline">
                    <Link to="/pricing">See plan details</Link>
                  </Button>
                </div>
              </div>
              <div className="rounded-2xl border border-primary/30 bg-card/80 p-6 shadow-lg shadow-primary/10">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
                    <ShieldCheck className="h-6 w-6" />
                  </span>
                  <div>
                    <div className="text-sm font-semibold">Founding Member Guarantee</div>
                    <div className="text-xs text-muted-foreground">Proudly Canadian · Locked-in pricing</div>
                  </div>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">
                  As long as your account remains active, your Founding Member pricing will
                  never go up. It's our thank-you to the Canadian businesses helping us build a
                  better marketplace for Canada.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="border-b border-border">
          <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
            <div className="text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Frequently asked questions
              </h2>
              <p className="mt-3 text-muted-foreground">
                Everything Canadian businesses ask before joining Spott.ca.
              </p>
            </div>
            <div className="mt-8 divide-y divide-border rounded-2xl border border-border bg-card/40">
              {FAQS.map((item, i) => (
                <FaqItem key={item.q} item={item} defaultOpen={i === 0} />
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="bg-gradient-to-br from-primary/15 via-card/40 to-background">
          <div className="mx-auto max-w-4xl px-4 py-16 text-center sm:px-6">
            <Building2 className="mx-auto mb-3 h-10 w-10 text-primary" />
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Ready to grow your business on Spott.ca?
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Create your free Canadian business listing in minutes — and start getting
              discovered by local customers today.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/business/new">List your business — free</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/pricing">View pricing</Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link to="/contact">Talk to our team</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Proudly Canadian · Free to start · Cancel anytime
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}

function FaqItem({
  item,
  defaultOpen = false,
}: {
  item: { q: string; a: string };
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold sm:text-base">{item.q}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-muted-foreground transition ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {open && (
        <div className="px-5 pb-5 text-sm text-muted-foreground">{item.a}</div>
      )}
    </div>
  );
}
