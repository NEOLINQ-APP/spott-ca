import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy — Spott.ca" },
      { name: "description", content: "How Spott.ca collects, uses, stores, and protects your personal information." },
      { property: "og:title", content: "Spott.ca Privacy Policy" },
      { property: "og:description", content: "How Spott.ca collects and protects your personal information." },
      { property: "og:url", content: "https://www.spott.ca/privacy" },
    ],
    links: [{ rel: "canonical", href: "https://www.spott.ca/privacy" }],
  }),
});

function PrivacyPage() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Privacy Policy</h1>
        <p className="mt-2 text-xs text-muted-foreground">Last updated: May 24, 2026</p>

        <article className="prose prose-sm dark:prose-invert mt-8 max-w-none text-sm leading-relaxed text-foreground/90 space-y-6">
          <section>
            <h2 className="font-display text-lg font-semibold">1. Introduction</h2>
            <p>Spott.ca ("we", "us") respects your privacy. This policy explains what information we collect, how we use it, and the choices you have. We comply with Canada's Personal Information Protection and Electronic Documents Act (PIPEDA).</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold">2. Information we collect</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li><strong>Account info</strong>: name, email, password hash, profile photo.</li>
              <li><strong>Listing info</strong>: business name, address, phone, hours, photos, description.</li>
              <li><strong>Reviews & messages</strong>: ratings, text, photos, and direct messages you post.</li>
              <li><strong>Usage data</strong>: pages viewed, searches, clicks (used to improve search relevance and analytics).</li>
              <li><strong>Payment data</strong>: handled by Stripe. We store only subscription metadata, never full card numbers.</li>
            </ul>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold">3. How we use your information</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>Operate, maintain, and improve the Service.</li>
              <li>Display listings, reviews, and search results.</li>
              <li>Process subscriptions and add-on purchases.</li>
              <li>Send transactional emails (account, billing, claim approvals).</li>
              <li>Detect fraud, abuse, and policy violations.</li>
            </ul>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold">4. Sharing</h2>
            <p>We share data only with trusted service providers needed to run Spott.ca: cloud hosting and database (Lovable Cloud), payments (Stripe), email delivery, and analytics. We do not sell your personal information.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold">5. Cookies</h2>
            <p>We use cookies and similar technologies to keep you signed in, remember preferences (such as language and theme), and measure aggregate usage. You can clear cookies in your browser at any time.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold">6. Data retention</h2>
            <p>We keep account and listing data for as long as your account is active. You may delete your listings or account at any time; backups are purged on a rolling 30-day schedule.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold">7. Your rights</h2>
            <p>You may access, correct, export, or delete your personal information from your dashboard or by emailing us. We will respond to verified requests within 30 days.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold">8. Security</h2>
            <p>We use encryption in transit (HTTPS), encryption at rest for our database, role-based access controls, and row-level security to protect your data. No system is perfectly secure — please use a strong, unique password.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold">9. Children</h2>
            <p>The Service is not intended for children under 13. We do not knowingly collect personal information from children.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold">10. International transfers</h2>
            <p>Our hosting providers may process data outside Canada. We require providers to maintain protections at least equivalent to PIPEDA.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold">11. Changes</h2>
            <p>We may update this policy. Material changes will be posted here with a new "Last updated" date.</p>
          </section>
          <section>
            <h2 className="font-display text-lg font-semibold">12. Contact</h2>
            <p>Privacy questions or requests: <a className="text-primary hover:underline" href="mailto:privacy@spott.ca">privacy@spott.ca</a>.</p>
          </section>
        </article>
      </main>
      <SiteFooter />
    </div>
  );
}
