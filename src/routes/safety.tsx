import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Shield,
  AlertTriangle,
  MapPin,
  Flag,
  Lock,
  MessageSquareWarning,
  Car,
  Handshake,
} from "lucide-react";

export const Route = createFileRoute("/safety")({
  component: SafetyCenter,
  head: () => ({
    meta: [
      { title: "Safety Center — Spott.ca" },
      {
        name: "description",
        content:
          "Learn how to buy, sell, and meet safely on Spott.ca. Scam prevention, safe meet-up guidelines, and how to report a listing.",
      },
      { property: "og:title", content: "Safety Center — Spott.ca" },
      {
        property: "og:description",
        content:
          "Practical tips to avoid scams, meet safely, and report bad actors on Canada's local marketplace and business directory.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://www.spott.ca/safety" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://www.spott.ca/safety" }],
  }),
});

function SafetyCenter() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="relative border-b border-border">
        <div className="absolute inset-0 bg-aurora opacity-50" />
        <div className="relative mx-auto max-w-4xl px-4 py-14 sm:py-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Shield className="h-3.5 w-3.5" /> Spott Safety Center
          </div>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
            Buy, sell, and meet — safely.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground">
            Most people on Spott.ca are honest neighbours. A small minority isn't. Use these
            guidelines to spot scams before they cost you, meet strangers on your terms, and
            report anything that feels off.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-10">
        {/* Quick highlights */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              Icon: AlertTriangle,
              title: "Trust your gut",
              body: "If a deal, message, or story feels off — walk away. No listing is worth the risk.",
            },
            {
              Icon: MapPin,
              title: "Meet in public",
              body: "Daytime, well-lit, high-traffic. Many police stations offer safe-exchange zones.",
            },
            {
              Icon: Lock,
              title: "Keep it on-platform",
              body: "Chat, review, and confirm through Spott so we can help if something goes wrong.",
            },
          ].map(({ Icon, title, body }) => (
            <div
              key={title}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <Icon className="h-5 w-5 text-primary" />
              <h3 className="mt-3 font-semibold">{title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="scams">
              <AccordionTrigger className="text-left">
                <span className="inline-flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-primary" />
                  Scam prevention — the 8 biggest red flags
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="ml-1 space-y-3 text-sm text-muted-foreground">
                  <li>
                    <strong className="text-foreground">Overpayment offers.</strong> "I'll send
                    a cheque for more — refund me the difference." Always a scam.
                  </li>
                  <li>
                    <strong className="text-foreground">Ship-before-you-see-it.</strong>{" "}
                    Legitimate local buyers meet in person or use an escrow service.
                  </li>
                  <li>
                    <strong className="text-foreground">"Verify code" requests.</strong> Nobody
                    on Spott needs a Google Voice or SMS code from your phone. Ever.
                  </li>
                  <li>
                    <strong className="text-foreground">Gift cards, crypto, or wire only.</strong>{" "}
                    These are irreversible for a reason — scammers love them.
                  </li>
                  <li>
                    <strong className="text-foreground">Rush pressure.</strong> "I need to sell
                    today, I'm moving tomorrow" is the oldest bait in the book.
                  </li>
                  <li>
                    <strong className="text-foreground">Off-platform chat.</strong> They want
                    you on WhatsApp, Telegram, or email so Spott can't see the conversation.
                  </li>
                  <li>
                    <strong className="text-foreground">Deposit for a rental / vehicle you
                    haven't seen.</strong> Always inspect in person first.
                  </li>
                  <li>
                    <strong className="text-foreground">Prices that are too good.</strong>{" "}
                    Check our Market Value badge on vehicles. If it's $5,000 below market —
                    ask why.
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="meetup">
              <AccordionTrigger className="text-left">
                <span className="inline-flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" />
                  Safe meet-up guidelines
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="ml-1 space-y-3 text-sm text-muted-foreground">
                  <li>
                    <strong className="text-foreground">Pick the location.</strong> Public,
                    busy, well-lit — coffee shops, shopping-mall parking lots, or police
                    "Community Safe Exchange" zones (available in most Canadian cities).
                  </li>
                  <li>
                    <strong className="text-foreground">Bring someone.</strong> Especially for
                    high-value items, vehicles, and evening meetings.
                  </li>
                  <li>
                    <strong className="text-foreground">Tell someone your plan.</strong> Share
                    the listing link, the time, and the location with a friend or family
                    member.
                  </li>
                  <li>
                    <strong className="text-foreground">Cash or e-Transfer only.</strong>{" "}
                    Confirm e-Transfers land before handing anything over. Never accept
                    cheques from strangers.
                  </li>
                  <li>
                    <strong className="text-foreground">Test before you pay.</strong>{" "}
                    Electronics: plug in. Vehicles: test drive with a mechanic if possible.
                    Furniture: check drawers, seams, and stains.
                  </li>
                  <li>
                    <strong className="text-foreground">Don't invite strangers home.</strong>{" "}
                    Move bulky items to a garage, driveway, or storage — never invite an
                    unknown buyer inside your home.
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="vehicles">
              <AccordionTrigger className="text-left">
                <span className="inline-flex items-center gap-2">
                  <Car className="h-4 w-4 text-primary" />
                  Vehicle-specific safety
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="ml-1 space-y-3 text-sm text-muted-foreground">
                  <li>Run the VIN through your provincial registry before paying a deposit.</li>
                  <li>Verify ownership matches the seller's ID.</li>
                  <li>Get a pre-purchase inspection from an independent mechanic.</li>
                  <li>Check the Spott Market Value badge — deals well below market often
                    hide accident, salvage, or lien history.</li>
                  <li>Never wire a deposit for a vehicle you haven't physically seen.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="businesses">
              <AccordionTrigger className="text-left">
                <span className="inline-flex items-center gap-2">
                  <Handshake className="h-4 w-4 text-primary" />
                  Booking or hiring a business
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="ml-1 space-y-3 text-sm text-muted-foreground">
                  <li>Look for the Spott <strong className="text-foreground">Verified</strong>{" "}
                    badge — we've reviewed documents on file.</li>
                  <li>Read multiple reviews, including 2- and 3-star ones. They're often
                    the most honest.</li>
                  <li>Get a written quote before any work begins.</li>
                  <li>Never pay 100% up front for services not yet performed.</li>
                  <li>
                    <Link to="/verify" className="text-primary hover:underline">
                      Learn about Spott verification badges →
                    </Link>
                  </li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="report">
              <AccordionTrigger className="text-left">
                <span className="inline-flex items-center gap-2">
                  <Flag className="h-4 w-4 text-primary" />
                  How to report a listing, message, or user
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Every listing card, review, and profile on Spott has a{" "}
                    <strong className="text-foreground">Report</strong> option in its menu.
                    Reports go straight to our moderation queue and are typically reviewed
                    within 24 hours.
                  </p>
                  <p className="font-semibold text-foreground">Please report:</p>
                  <ul className="ml-5 list-disc space-y-1">
                    <li>Scam attempts or suspicious payment requests</li>
                    <li>Counterfeit, stolen, or illegal items</li>
                    <li>Weapons, tobacco, or age-restricted items sold to minors</li>
                    <li>Harassment, hate speech, or threats in messages</li>
                    <li>Fake reviews or review-manipulation offers</li>
                    <li>Impersonation of a real business or person</li>
                  </ul>
                  <p>
                    Urgent safety concern? Contact your local police first, then email us at{" "}
                    <a href="mailto:safety@spott.ca" className="text-primary hover:underline">
                      safety@spott.ca
                    </a>{" "}
                    with the listing URL and screenshots.
                  </p>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="account">
              <AccordionTrigger className="text-left">
                <span className="inline-flex items-center gap-2">
                  <Lock className="h-4 w-4 text-primary" />
                  Protecting your Spott account
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="ml-1 space-y-3 text-sm text-muted-foreground">
                  <li>Use a unique password — a password manager makes this easy.</li>
                  <li>Sign in with Google or Apple when possible; both add 2-step
                    verification for free.</li>
                  <li>Never share your password, verification codes, or session links with
                    anyone claiming to be Spott support. We will never ask.</li>
                  <li>Review your active sessions periodically in your profile settings.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="phishing">
              <AccordionTrigger className="text-left">
                <span className="inline-flex items-center gap-2">
                  <MessageSquareWarning className="h-4 w-4 text-primary" />
                  Spotting fake "Spott" emails and texts
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <ul className="ml-1 space-y-3 text-sm text-muted-foreground">
                  <li>Legit Spott emails always come from <strong>@spott.ca</strong> — check
                    the sender address, not the display name.</li>
                  <li>We never ask you to "confirm your payment" by clicking a link outside
                    spott.ca.</li>
                  <li>Hover over links before clicking. If the URL isn't spott.ca — don't
                    click.</li>
                  <li>Suspicious message? Forward it to{" "}
                    <a href="mailto:phishing@spott.ca" className="text-primary hover:underline">
                      phishing@spott.ca
                    </a>{" "}
                    and delete it.</li>
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>

        <div className="mt-12 rounded-2xl border border-primary/30 bg-primary/5 p-6 text-center">
          <Shield className="mx-auto h-8 w-8 text-primary" />
          <h2 className="mt-3 font-display text-2xl font-semibold">Still not sure?</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            Our team is happy to review a listing or message with you before you commit.
            Reach us any time at{" "}
            <a href="mailto:safety@spott.ca" className="text-primary hover:underline">
              safety@spott.ca
            </a>
            .
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link
              to="/verify"
              className="inline-flex items-center gap-2 rounded-lg border border-border bg-background px-4 py-2 text-sm font-medium hover:border-primary/40"
            >
              About verification badges
            </Link>
            <Link
              to="/marketplace"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Back to marketplace
            </Link>
          </div>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          This page is maintained by Spott.ca to help our community stay safe. It is not
          legal advice, insurance, or a guarantee against loss.
        </p>
      </div>
    </div>
  );
}
