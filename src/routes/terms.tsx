import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms & Conditions — Spott.ca" },
      { name: "description", content: "The terms governing your use of Spott.ca, including listings, reviews, billing, and acceptable use." },
      { property: "og:title", content: "Spott.ca Terms & Conditions" },
      { property: "og:description", content: "The terms governing your use of Spott.ca." },
      { property: "og:url", content: "https://www.spott.ca/terms" },
    ],
    links: [{ rel: "canonical", href: "https://www.spott.ca/terms" }],
  }),
});

function TermsPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Terms & Conditions</h1>
        <p className="mt-2 text-xs text-muted-foreground">Last updated: May 24, 2026</p>

        <article className="prose prose-sm dark:prose-invert mt-8 max-w-none text-sm leading-relaxed text-foreground/90 space-y-6">
          <section>
            <h2 className="font-display text-lg font-semibold">1. Acceptance of terms</h2>
            <p>By accessing or using Spott.ca (the "Service"), you agree to be bound by these Terms & Conditions. If you do not agree, do not use the Service.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold">2. Who can use Spott.ca</h2>
            <p>You must be at least 13 years old. Business owners must have legal authority to represent the business they claim or list.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold">3. Listings</h2>
            <p>Listings must describe a real Canadian business and provide accurate name, location, contact info, hours, and category. We may review, edit, or remove listings that violate these terms or our community guidelines.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold">4. Reviews and user content</h2>
            <p>Reviews must reflect a genuine first-hand experience. Defamatory, fraudulent, harassing, or paid-for reviews are prohibited. You retain ownership of content you post but grant Spott.ca a worldwide, royalty-free license to host, display, and promote it on the Service.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold">5. Subscriptions and billing</h2>
            <p>Paid plans and add-ons are billed in Canadian dollars via Stripe. Subscriptions renew automatically until cancelled from your dashboard. Fees already paid are non-refundable except where required by law.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold">6. Acceptable use</h2>
            <p>You agree not to: (a) scrape or copy the directory in bulk, (b) submit false or misleading information, (c) impersonate any person or business, (d) interfere with the Service or other users, or (e) use the Service to violate Canadian law.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold">7. Intellectual property</h2>
            <p>Spott.ca, its logo, and platform code are owned by us. You may not copy, modify, or create derivative works of the Service without permission.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold">8. Disclaimer</h2>
            <p>The Service is provided "as is" without warranties of any kind. We do not guarantee the accuracy of listings, reviews, or hours. Always verify directly with the business.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold">9. Limitation of liability</h2>
            <p>To the maximum extent permitted by law, Spott.ca and its operators are not liable for indirect, incidental, or consequential damages arising from your use of the Service.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold">10. Termination</h2>
            <p>We may suspend or terminate accounts that violate these terms. You may delete your account at any time from your dashboard.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold">11. Governing law</h2>
            <p>These terms are governed by the laws of the Province of Ontario and the federal laws of Canada applicable therein.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold">12. Changes</h2>
            <p>We may update these terms. Material changes will be highlighted on this page with a new "Last updated" date.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold">13. Contact</h2>
            <p>Questions about these terms: <a className="text-primary hover:underline" href="mailto:hello@spott.ca">hello@spott.ca</a>.</p>
          </section>
        </article>
      </main>
    </div>
  );
}
