import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms & Conditions — Spott.ca" },
      { name: "description", content: "Terms governing Spott.ca: listings, marketplace orders, escrow, refunds, promoter program, fraud prevention, and acceptable use." },
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
        <p className="mt-2 text-xs text-muted-foreground">Last updated: June 3, 2026</p>

        <article className="prose prose-sm dark:prose-invert mt-8 max-w-none text-sm leading-relaxed text-foreground/90 space-y-6">
          <section>
            <h2 className="font-display text-lg font-semibold">1. Acceptance of terms</h2>
            <p>By accessing or using Spott.ca (the "Service"), you agree to be bound by these Terms & Conditions. If you do not agree, do not use the Service. Spott.ca is a modern, trustworthy, and secure online marketplace and business listing directory operating in Canada.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">2. Who can use Spott.ca</h2>
            <p>You must be at least 13 years old. Business owners must have legal authority to represent the business they claim or list. Promoters must be at least 18 years old and meet the additional requirements in section 9.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">3. Listings</h2>
            <p>Listings must describe a real Canadian business and provide accurate name, location, contact info, hours, and category. We may review, edit, suspend, or remove listings that violate these terms or our community guidelines.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">4. Reviews and user content</h2>
            <p>Reviews must reflect a genuine first-hand experience. Defamatory, fraudulent, harassing, or paid-for reviews are prohibited. You retain ownership of content you post but grant Spott.ca a worldwide, royalty-free license to host, display, and promote it on the Service.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">5. Subscriptions, ads, and billing</h2>
            <p>Paid plans, featured listings, sponsored ads, and add-ons are billed in Canadian dollars and processed through our payment partners. Subscriptions renew automatically until cancelled from your dashboard. Fees already paid are non-refundable except where required by law.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">6. Payment methods</h2>
            <p>Spott.ca accepts major credit and debit cards, Apple Pay, Google Pay, PayPal, and (where supported) Canadian Interac e-Transfer through our processing partners. All transactions are encrypted and tokenized — Spott.ca never stores raw card numbers on its servers. We may add or remove payment methods at any time.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">7. Marketplace orders &amp; escrow (Buyer Protection)</h2>
            <p>All marketplace purchases made through "Add to Cart" are processed in <strong>escrow</strong>, modelled on industry-leading marketplaces. Funds are <strong>held by Spott.ca</strong> and are not released to the seller until:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>the buyer confirms the item was received as described, <em>or</em></li>
              <li>the standard inspection / return window has expired with no open dispute, <em>or</em></li>
              <li>any dispute opened during that window has been resolved.</li>
            </ul>
            <p>Buyers and sellers deal directly with each other for delivery, pickup, and item handover. Spott.ca is a venue and escrow agent — we are not a party to the underlying sale. If a product is returned or refunded under section 8, the corresponding funds are returned to the buyer and any promoter commission tied to that order is reversed.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">8. Returns &amp; refunds</h2>
            <p>Sellers must clearly state their return policy on each listing. Where a return policy is not stated, a default 14-day return window applies for items that are not as described, defective, or never delivered. Refunds are issued from escrowed funds back to the buyer's original payment method. Spott.ca may, at its sole discretion, refund the buyer directly from held funds where a seller fails to respond to a legitimate dispute within 7 days.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">9. Promoter program</h2>
            <p>The Spott.ca Promoter Program is open to verified business owners only. To be approved as a promoter you must:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>hold a <strong>valid Canadian Business Number (BN)</strong> issued by the Canada Revenue Agency and provide it at the time of application;</li>
              <li>be at least 18 years old and legally able to enter into contracts in your province or territory;</li>
              <li>operate a real business and accurately represent Spott.ca in your promotions.</li>
            </ul>
            <p>Due to high volume, applications take <strong>7 to 30 days</strong> to review. Approval is at Spott.ca's sole discretion and may be revoked at any time for breach of these terms.</p>
            <p><strong>Commission &amp; payout timing.</strong> Commissions on referred orders are <em>pending</em> until the underlying sale clears escrow under section 7 — that is, no commission is released until the buyer's return / refund window has closed and the order is finalized. Once cleared, the commission becomes <em>available</em> in your promoter dashboard. Available funds may be cashed out at any time; funds shown as <em>held</em> or <em>pending</em> remain on hold until clearance.</p>
            <p><strong>Reversals.</strong> If the underlying order is refunded, charged back, or reversed for fraud, the related commission is reversed, even if it had already been marked available. Spott.ca may offset reversed amounts against future payouts.</p>
            <p><strong>Tax.</strong> Promoter earnings are gross of tax. You are responsible for collecting and remitting any GST/HST/PST/QST applicable to your services and for declaring promoter income to the CRA.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">10. Fraud prevention &amp; right to hold or refuse payment</h2>
            <p>Spott.ca actively monitors transactions for fraud, abuse, and policy violations. We reserve the right, at our sole discretion and without prior notice, to <strong>hold, delay, refuse, reverse, or refund</strong> any payment, payout, or commission where we reasonably suspect:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>illegal activity, money laundering, terrorist financing, or sanctions evasion;</li>
              <li>the sale of prohibited, counterfeit, stolen, recalled, or unsafe goods;</li>
              <li>self-dealing, fake orders, fake reviews, or commission manipulation by promoters;</li>
              <li>use of stolen payment credentials, identity theft, or chargeback fraud;</li>
              <li>violation of these terms, our community guidelines, or applicable Canadian law.</li>
            </ul>
            <p>Where required by law or by our payment partners, we may share transaction data with law enforcement, regulators, and financial institutions. Funds held under this section may be retained for the period reasonably needed to investigate, satisfy a chargeback, or comply with a legal request.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">11. Prohibited activity</h2>
            <p>You agree NOT to:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>scrape, copy, or resell the directory or marketplace data in bulk;</li>
              <li>submit false, misleading, or impersonating information about yourself or any business;</li>
              <li>list firearms, controlled substances, recalled items, counterfeit goods, adult content, or any item that is illegal to sell in Canada;</li>
              <li>create multiple accounts to game ratings, referrals, promoter commissions, or escrow holds;</li>
              <li>solicit payment outside the Spott.ca platform to evade buyer protection, commissions, or platform fees;</li>
              <li>upload malware, attempt to compromise the Service, or probe it for vulnerabilities without written authorization;</li>
              <li>harass, threaten, dox, or defraud other users.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">12. Identity verification</h2>
            <p>Spott.ca may require sellers, promoters, and high-value buyers to verify their identity, business registration, or banking information at any time. We may suspend accounts and hold related funds until verification is completed to our satisfaction.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">13. Chargebacks</h2>
            <p>If a buyer initiates a chargeback through their bank or card network instead of using Spott.ca's dispute process, the related funds will be held pending the chargeback outcome. Sellers may be debited the chargeback amount plus a processing fee. Repeated chargeback fraud will result in permanent account termination and may be reported to the relevant authorities.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">14. Intellectual property</h2>
            <p>Spott.ca, the Spott.ca name and logo, and the platform code are owned by us. You may not copy, modify, reverse-engineer, or create derivative works of the Service without prior written permission.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">15. Disclaimer</h2>
            <p>The Service is provided "as is" without warranties of any kind. Spott.ca is a venue and does not manufacture, ship, or warrant any product sold on the marketplace. We do not guarantee the accuracy of listings, reviews, or hours. Always verify directly with the business or seller.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">16. Limitation of liability</h2>
            <p>To the maximum extent permitted by law, Spott.ca and its operators are not liable for indirect, incidental, special, or consequential damages arising from your use of the Service. Our aggregate liability for any claim is limited to the greater of (a) the fees you paid Spott.ca in the 3 months preceding the claim, or (b) CAD $100.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">17. Indemnification</h2>
            <p>You agree to indemnify and hold Spott.ca, its directors, employees, and partners harmless from any claim, loss, or expense (including reasonable legal fees) arising from your listings, products, content, promoter activity, or breach of these terms.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">18. Termination</h2>
            <p>We may suspend or terminate any account that violates these terms, with or without notice. On termination, pending escrowed funds for legitimate completed orders will be released to the appropriate party once the standard hold period has elapsed; funds tied to fraud, chargebacks, or unresolved disputes may be retained as described in section 10.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">19. Governing law</h2>
            <p>These terms are governed by the laws of the Province of Ontario and the federal laws of Canada applicable therein. The parties submit to the exclusive jurisdiction of the courts of Ontario.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">20. Changes</h2>
            <p>We may update these terms. Material changes will be highlighted on this page with a new "Last updated" date. Continued use of the Service after a change constitutes acceptance of the new terms.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">21. Contact</h2>
            <p>Questions about these terms or to report fraud: <a className="text-primary hover:underline" href="mailto:hello@spott.ca">hello@spott.ca</a>.</p>
          </section>
        </article>
      </main>
    </div>
  );
}
