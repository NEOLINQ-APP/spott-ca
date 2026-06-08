import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
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
} from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Spott.ca — Canada's Marketplace & Business Directory" },
      {
        name: "description",
        content:
          "Spott.ca is Canada's modern marketplace and local business directory. Discover Canadian businesses, buy and sell locally, and connect with your community — built in Canada, for Canadians.",
      },
      { property: "og:title", content: "About Spott.ca — Canada's Marketplace & Business Directory" },
      {
        property: "og:description",
        content:
          "Discover the story, mission, and vision behind Spott.ca — Canada's home for local business listings, classifieds, and community commerce.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://spott.ca/about" },
    ],
    links: [{ rel: "canonical", href: "https://spott.ca/about" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: "About Spott.ca",
          url: "https://spott.ca/about",
          description:
            "Spott.ca is Canada's modern marketplace and business directory — built in Canada, for Canadians.",
          about: {
            "@type": "Organization",
            name: "Spott.ca",
            url: "https://spott.ca",
            areaServed: "CA",
            description:
              "Canadian business directory and marketplace for local listings, classifieds, and community commerce.",
          },
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
}: {
  id?: string;
  icon: any;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-5 w-5" />
        </span>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
      </div>
      <div className="text-[15px] leading-relaxed text-muted-foreground space-y-3">{children}</div>
    </section>
  );
}

function BenefitCard({
  icon: Icon,
  title,
  points,
}: {
  icon: any;
  title: string;
  points: string[];
}) {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Icon className="h-5 w-5 text-primary" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm text-muted-foreground">
          {points.map((p) => (
            <li key={p} className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>{p}</span>
            </li>
          ))}
        </ul>
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
        <header className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5" /> Built in Canada, for Canadians
          </div>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            About Spott.ca
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Spott.ca is Canada's modern marketplace and local business directory — a single home
            for Canadian classifieds, verified business listings, and the people who power our
            communities.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link to="/directory">Browse Canadian businesses</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/marketplace">Explore the marketplace</Link>
            </Button>
          </div>
        </header>

        <div className="space-y-14">
          <Section id="story" icon={Sparkles} title="Our Story">
            <p>
              Spott.ca was born from a simple frustration: Canadians deserve a better place to
              discover local businesses, buy and sell with their neighbours, and support the
              communities they live in. For too long, Canadian classifieds and local business
              listings have been scattered across foreign platforms that don't understand our
              cities, our culture, or our small business owners.
            </p>
            <p>
              We set out to build something different — a homegrown Canadian marketplace and
              business directory that puts trust, transparency, and community first. Whether
              you're searching for a trusted local mechanic in Toronto, a family-run restaurant in
              Whitehorse, or a great deal on a used car in Halifax, Spott is the place to find it.
            </p>
          </Section>

          <Section id="why" icon={Heart} title="Why Spott.ca Was Created">
            <p>
              Canada needed its own platform — one designed around Canadian cities, Canadian
              businesses, and Canadian buyers and sellers. Spott.ca was created to give locals a
              trusted way to discover verified businesses, post classified ads, and connect
              directly with owners and sellers without the noise of global mega-platforms.
            </p>
            <p>
              From day one, our goal has been to make it easier to <strong>buy and sell in
              Canada</strong>, find <strong>local business listings across Canada</strong>, and
              celebrate the entrepreneurs that make our neighbourhoods unique.
            </p>
          </Section>

          <Section id="mission" icon={Target} title="Our Mission">
            <p>
              To empower every Canadian — individuals, businesses, dealerships, realtors, and
              creators — with a single trusted platform to discover, connect, and grow locally.
            </p>
          </Section>

          <Section id="vision" icon={Eye} title="Our Vision">
            <p>
              To become Canada's most trusted marketplace and business directory — a true
              alternative to foreign-owned platforms, where every Canadian community is
              represented, every business has a home, and every transaction strengthens the local
              economy.
            </p>
          </Section>

          <Section id="why-canadians" icon={ShieldCheck} title="Why Canadians Should Use Spott.ca">
            <ul className="list-disc space-y-2 pl-5">
              <li>100% Canadian — built in Canada, hosted for Canadians, focused on Canadian cities.</li>
              <li>Verified business listings and ID-verified reviews you can trust.</li>
              <li>A real Canadian marketplace for buying, selling, and trading locally.</li>
              <li>Modern, mobile-first experience designed for how Canadians actually shop.</li>
              <li>Direct messaging between buyers, sellers, and business owners — no middlemen.</li>
              <li>Support local: every search, click, and purchase helps Canadian small businesses.</li>
            </ul>
          </Section>

          <Section id="benefits" icon={Users} title="Benefits For Everyone">
            <div className="mt-2 grid gap-4 sm:grid-cols-2">
              <BenefitCard
                icon={Users}
                title="For Individuals"
                points={[
                  "Find trusted local businesses across Canada in seconds.",
                  "Buy, sell, and trade items in the Canadian marketplace.",
                  "Read honest reviews from verified Canadian neighbours.",
                  "Message sellers and owners directly — fast and safe.",
                ]}
              />
              <BenefitCard
                icon={Building2}
                title="For Businesses"
                points={[
                  "Claim your free Canadian business listing.",
                  "Reach local customers actively searching in your city.",
                  "Showcase photos, hours, services, and special offers.",
                  "Build trust with verified reviews and a real owner profile.",
                ]}
              />
              <BenefitCard
                icon={Car}
                title="For Dealerships"
                points={[
                  "List your full vehicle inventory on a Canadian platform.",
                  "Capture leads from buyers ready to test drive or trade in.",
                  "Stand out with a verified dealer profile and storefront.",
                  "Reach buyers across Canada — not just your local market.",
                ]}
              />
              <BenefitCard
                icon={Home}
                title="For Realtors"
                points={[
                  "Promote listings to motivated Canadian buyers and renters.",
                  "Build your local brand with a verified realtor profile.",
                  "Connect with leads directly through Spott messaging.",
                  "Be discovered alongside other trusted local services.",
                ]}
              />
              <BenefitCard
                icon={Megaphone}
                title="For Content Creators & Influencers"
                points={[
                  "Get discovered by Canadian brands and businesses.",
                  "Partner with local businesses through the Spott directory.",
                  "Promote products and services to a Canadian audience.",
                  "Grow a real, local following — not just vanity metrics.",
                ]}
              />
              <BenefitCard
                icon={ShoppingBag}
                title="For Buyers & Sellers"
                points={[
                  "A safer, simpler Canadian classifieds experience.",
                  "Local pickup, local payment, local trust.",
                  "Powerful search across categories and cities.",
                  "No bots, no scams — real Canadians, real listings.",
                ]}
              />
            </div>
          </Section>

          <Section id="canada" icon={MapPin} title="Built In Canada, For Canadians">
            <p>
              Spott.ca is proudly Canadian. From our team to our technology to the businesses we
              feature, everything about Spott is rooted in Canada. We understand the difference
              between Yellowknife and Toronto, between a corner bakery in Montréal and a family
              auto shop in Calgary — and we built our platform to reflect that.
            </p>
            <p>
              When you use Spott, you're supporting a Canadian alternative to foreign-owned
              classifieds and directories — and helping keep more dollars in the Canadian economy.
            </p>
          </Section>

          <Section id="roadmap" icon={Rocket} title="Future Roadmap">
            <ul className="list-disc space-y-2 pl-5">
              <li>Expanded categories across every Canadian province and territory.</li>
              <li>Deeper tools for small businesses — bookings, ordering, and promotions.</li>
              <li>Trusted seller verification and secure in-platform payments.</li>
              <li>Creator and influencer partnerships with local Canadian brands.</li>
              <li>Realtor and dealership storefronts with rich media and lead tools.</li>
              <li>A mobile app experience built for everyday Canadian life.</li>
            </ul>
          </Section>

          {/* SEO-rich closing content */}
          <section className="rounded-2xl border border-border bg-card/40 p-6">
            <h2 className="text-xl font-semibold">
              Canada's Marketplace and Business Directory
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Spott.ca is the modern Canadian marketplace and Canadian business directory built
              for how Canadians actually search, shop, and connect. Whether you're looking for
              local business listings in Canada, browsing Canadian classifieds, or trying to
              buy and sell in Canada with confidence, Spott brings together verified Canadian
              businesses, real reviews, and a trusted local marketplace in one place.
              From restaurants and salons to mechanics, dealerships, realtors, and creators,
              Spott is where Canadian businesses and Canadian communities meet.
            </p>
          </section>

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            <Button asChild>
              <Link to="/directory">Find a Canadian business</Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/marketplace">Shop the marketplace</Link>
            </Button>
            <Button asChild variant="ghost">
              <Link to="/business/new">Add your business</Link>
            </Button>
          </div>
        </div>
      </main>
    </>
  );
}
