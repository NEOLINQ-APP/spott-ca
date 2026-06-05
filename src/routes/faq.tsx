import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/faq")({
  component: FaqPage,
  head: () => ({
    meta: [
      { title: "FAQ — Spott" },
      { name: "description", content: "Answers to common questions about listings, reviews, billing, and claiming your business on Spott." },
      { property: "og:title", content: "Spott FAQ" },
      { property: "og:description", content: "Common questions about Spott — Canada's business directory." },
      { property: "og:url", content: "https://www.spott.ca/faq" },
    ],
    links: [{ rel: "canonical", href: "https://www.spott.ca/faq" }],
  }),
});

const QA = [
  { q: "What is Spott?", a: "Spott is a Canadian business directory where customers discover, review, and connect with verified local businesses." },
  { q: "Is it free to list my business?", a: "Yes — creating a listing is free. Optional paid plans unlock more photos, featured placement, bump-ups, and specials." },
  { q: "How do I claim an existing listing?", a: "Open the listing and click 'Is this your business?'. Submit a short verification and our team approves claims quickly." },
  { q: "Why is my new listing 'pending'?", a: "All new and edited listings are reviewed by our team to keep the directory accurate and spam-free." },
  { q: "Can I reply to customer reviews?", a: "Yes. Once you own or claim the listing, you can post a public owner reply to each review from your dashboard." },
  { q: "How do I cancel my subscription?", a: "From your dashboard, click 'Manage billing' to open the secure billing portal where you can cancel or change your plan." },
  { q: "Are my payments secure?", a: "Payments are processed by Stripe. Spott never stores your full card details." },
  { q: "How do you determine 'Open now'?", a: "We compare the current time in your business's local timezone to the weekly hours you publish on your listing." },
  { q: "What do the $ symbols mean?", a: "They indicate the typical price range of a business — from $ (inexpensive) to $$$$$ (luxury). Owners set this on their listing." },
  { q: "How do I contact Spott support?", a: "Visit our Contact page or email hello@spott.ca." },
];

function FaqPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Frequently asked questions</h1>
        <p className="mt-2 text-sm text-muted-foreground">Everything you need to know about using Spott.</p>

        <div className="mt-8 space-y-3">
          {QA.map((item) => (
            <details key={item.q} className="group rounded-xl border border-border bg-card p-4 open:bg-card">
              <summary className="cursor-pointer list-none text-sm font-medium marker:hidden">
                <span className="mr-2 text-muted-foreground group-open:text-primary">+</span>
                {item.q}
              </summary>
              <p className="mt-3 pl-5 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
            </details>
          ))}
        </div>

        <div className="mt-10 rounded-xl border border-dashed border-border bg-card/40 p-5 text-center text-sm">
          Still have questions? <Link to="/contact" className="text-primary hover:underline">Contact us</Link>.
        </div>
      </main>
    </div>
  );
}
