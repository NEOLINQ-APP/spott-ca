import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Sparkles,
  Building2,
  Car,
  Home,
  Megaphone,
  Users,
  Target,
  Eye,
  Heart,
  Rocket,
  ShieldCheck,
  ShoppingBag,
  Briefcase,
  CalendarDays,
  Mic2,
  TrendingUp,
  ArrowRight,
} from "lucide-react";

const META_TITLE =
  "About Spott.ca | Canada's Marketplace for Businesses, Services & Local Discovery";
const META_DESC =
  "Learn about Spott.ca, Canada's growing marketplace for local businesses, services, events, jobs, real estate, vehicles, and community connections.";
const URL = "https://spott.ca/about";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: META_TITLE },
      { name: "description", content: META_DESC },
      {
        name: "keywords",
        content:
          "Canadian marketplace, business directory Canada, local businesses Canada, buy and sell in Canada, Canadian classifieds, Canadian business listings, discover local businesses, support local businesses Canada",
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
          "@type": "AboutPage",
          name: "About Spott.ca",
          url: URL,
          description: META_DESC,
          inLanguage: "en-CA",
          isPartOf: {
            "@type": "WebSite",
            name: "Spott.ca",
            url: "https://spott.ca",
          },
          about: {
            "@type": "Organization",
            name: "Spott.ca",
            url: "https://spott.ca",
            areaServed: { "@type": "Country", name: "Canada" },
            description:
              "Canada's marketplace and business directory for local businesses, services, events, jobs, real estate, vehicles, and community.",
            sameAs: [
              "https://facebook.com/spott.ca",
              "https://instagram.com/spott.ca",
              "https://twitter.com/spott_ca",
              "https://linkedin.com/company/spott-ca",
            ],
          },
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: "https://spott.ca/" },
            { "@type": "ListItem", position: 2, name: "About", item: URL },
          ],
        }),
      },
    ],
  }),
  component: AboutPage,
});

function Section({
  id,
  icon: Icon,
  title,
  children,
  level = 2,
}: {
  id?: string;
  icon: any;
  title: string;
  children: React.ReactNode;
  level?: 2 | 3;
}) {
  const Heading = level === 2 ? "h2" : "h3";
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <Heading className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </Heading>
      </div>
      <div className="text-[15px] leading-relaxed text-muted-foreground space-y-3">
        {children}
      </div>
    </section>
  );
}

function AudienceCard({
  icon: Icon,
  title,
  blurb,
}: {
  icon: any;
  title: string;
  blurb: string;
}) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">{blurb}</p>
      </CardContent>
    </Card>
  );
}

function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        {/* Hero */}
        <header className="mb-14 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> Proudly Canadian · Built in Canada, for Canadians
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            About Spott.ca — Canada's Marketplace &amp; Business Directory
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Spott.ca is Canada's growing marketplace for local businesses, services, events,
            jobs, real estate, vehicles, and the people who make our communities thrive.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/auth">Create your free account</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/business/new">List your business</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/directory">Browse the directory</Link>
            </Button>
          </div>
        </header>

        <div className="space-y-14">
          <Section id="story" icon={Sparkles} title="Our Story">
            <p>
              Spott.ca was created out of a simple belief: Canadians deserve a homegrown
              marketplace that truly reflects our cities, our small businesses, and our
              communities. For years, Canadian classifieds and local business listings have
              been spread across foreign-owned platforms that don't understand Canada — our
              neighbourhoods, our entrepreneurs, or the way we shop and connect locally.
            </p>
            <p>
              We set out to build something better: a proudly Canadian marketplace and
              business directory where buying and selling in Canada, discovering local
              businesses, and supporting Canadian-owned services all live in one trusted
              place.
            </p>
          </Section>

          <Section id="mission" icon={Target} title="Our Mission">
            <p>
              To empower every Canadian — individuals, businesses, dealerships, realtors,
              service providers, employers, and creators — with a single trusted platform to
              discover, connect, and grow locally across Canada.
            </p>
          </Section>

          <Section id="why-exists" icon={Heart} title="Why Spott.ca Exists">
            <p>
              Canada needed its own platform — one built for Canadian cities, Canadian
              businesses, and Canadian buyers and sellers. Spott.ca exists to make it easier
              to <strong>buy and sell in Canada</strong>, find{" "}
              <strong>local business listings across Canada</strong>, and celebrate the
              entrepreneurs that make our neighbourhoods unique.
            </p>
            <p>
              From verified Canadian business listings to community-powered classifieds,
              every part of Spott.ca is designed to keep more discovery, more commerce, and
              more dollars inside Canadian communities.
            </p>
          </Section>

          <Section id="audience" icon={Users} title="Who Spott.ca Is For">
            <p>
              Spott.ca is built for everyone who lives, works, shops, and builds in Canada.
              Whether you're searching for a trusted local service, listing your business,
              or growing an audience — there's a place for you here.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <AudienceCard icon={Users} title="Individuals" blurb="Discover local businesses, services, events, and great deals across your community." />
              <AudienceCard icon={Building2} title="Businesses" blurb="Reach Canadians actively searching for what you offer in your city." />
              <AudienceCard icon={Car} title="Dealerships" blurb="Showcase inventory and capture qualified buyers on a Canadian platform." />
              <AudienceCard icon={Home} title="Realtors" blurb="Promote listings and build your brand with verified Canadian buyers and renters." />
              <AudienceCard icon={ShieldCheck} title="Service Providers" blurb="Get found by neighbours who need trusted, local Canadian expertise." />
              <AudienceCard icon={Briefcase} title="Employers" blurb="Post jobs and reach Canadian talent in your city and across the country." />
              <AudienceCard icon={Megaphone} title="Influencers" blurb="Partner with Canadian brands and grow a real local following." />
              <AudienceCard icon={Mic2} title="Podcasters" blurb="Reach Canadian listeners and connect with sponsors that align with your show." />
              <AudienceCard icon={CalendarDays} title="Event Organizers" blurb="Promote events and fill seats with locals across every Canadian city." />
            </div>
          </Section>

          <Section id="why-businesses" icon={TrendingUp} title="Why Businesses Choose Spott.ca">
            <ul className="list-disc space-y-2 pl-5">
              <li>A Canadian-built business directory designed for how locals actually search.</li>
              <li>Verified listings and trusted profiles that build customer confidence.</li>
              <li>Tools to showcase photos, hours, services, offers, inventory, and reviews.</li>
              <li>Direct messaging between owners and customers — no middlemen or noisy global feeds.</li>
              <li>Categories that fit Canadian life — from restaurants and salons to dealerships, realtors, trades, and services.</li>
              <li>A modern, mobile-first experience that helps your business get discovered.</li>
              <li>An alternative to foreign-owned platforms that takes Canadian small business seriously.</li>
            </ul>
            <div className="pt-2">
              <Button asChild>
                <Link to="/business/new">
                  List your business <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </Section>

          <Section id="why-canadians" icon={ShieldCheck} title="Why Canadians Use Spott.ca">
            <ul className="list-disc space-y-2 pl-5">
              <li>One trusted place to discover local businesses, services, events, jobs, real estate, and vehicles in Canada.</li>
              <li>Canadian classifieds with local pickup, local payment, and local trust.</li>
              <li>Verified reviews and real owner profiles you can rely on.</li>
              <li>Modern search across categories and Canadian cities, big and small.</li>
              <li>Support for local — every search, click, and purchase strengthens Canadian communities.</li>
              <li>Built in Canada, for Canadians — a real homegrown alternative to foreign-owned platforms.</li>
            </ul>
          </Section>

          <Section id="vision" icon={Eye} title="Our Vision">
            <p>
              Our long-term vision is to make Spott.ca the most trusted marketplace and
              business directory in Canada — a national platform where every Canadian
              community is represented, every business has a home, and every transaction
              helps strengthen the local economy.
            </p>
            <p>
              We're building Spott.ca to grow with Canada: deeper tools for small
              businesses, secure buying and selling experiences, richer storefronts for
              dealerships and realtors, opportunities for creators and event organizers, and
              a mobile experience built for everyday Canadian life.
            </p>
          </Section>

          {/* SEO-rich closing context */}
          <section className="rounded-2xl border border-border bg-card/40 p-6">
            <h2 className="text-xl font-semibold">
              Canada's Marketplace, Business Directory &amp; Local Discovery Platform
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Spott.ca brings together the Canadian marketplace, Canadian business
              directory, and Canadian classifieds in one modern platform. Whether you're
              looking to discover local businesses, support local businesses in Canada,
              buy and sell in Canada, or browse Canadian business listings across every
              province and territory — Spott.ca is built for you. From restaurants and
              salons to mechanics, dealerships, realtors, service providers, employers,
              influencers, podcasters, and event organizers, Spott is where Canadian
              businesses and Canadian communities meet.
            </p>
          </section>

          {/* Get Started Today / Final CTA */}
          <section
            id="get-started"
            className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-card/40 to-background p-8 text-center"
          >
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
              <Rocket className="h-3.5 w-3.5" /> Join the Canadian marketplace
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Get Started Today
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
              Whether you're an individual, business, dealership, realtor, service
              provider, employer, influencer, podcaster, or event organizer — Spott.ca is
              your home for discovery, connection, and growth across Canada.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg">
                <Link to="/auth">Create your account</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/business/new">List a business</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/marketplace">Explore the marketplace</Link>
              </Button>
              <Button asChild size="lg" variant="ghost">
                <Link to="/directory">Browse the business directory</Link>
              </Button>
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Free to join · Proudly Canadian · Built for every community in Canada.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
