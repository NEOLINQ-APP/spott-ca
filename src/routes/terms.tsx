import { createFileRoute } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms & Conditions — Spott" },
      { name: "description", content: "Terms governing Spott: listings, marketplace orders, escrow, refunds, promoter program, fraud prevention, and acceptable use." },
      { property: "og:title", content: "Spott Terms & Conditions" },
      { property: "og:description", content: "The terms governing your use of Spott." },
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
            <p>By accessing or using Spott (the "Service"), you agree to be bound by these Terms & Conditions. If you do not agree, do not use the Service. Spott is a modern, trustworthy, and secure online marketplace and business listing directory operating in Canada.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">2. Who can use Spott</h2>
            <p>You must be at least 13 years old. Business owners must have legal authority to represent the business they claim or list. Promoters must be at least 18 years old and meet the additional requirements in section 9.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">3. Listings</h2>
            <p>Listings must describe a real Canadian business and provide accurate name, location, contact info, hours, and category. We may review, edit, suspend, or remove listings that violate these terms or our community guidelines.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">4. Reviews and user content</h2>
            <p>Reviews must reflect a genuine first-hand experience. Defamatory, fraudulent, harassing, or paid-for reviews are prohibited. You retain ownership of content you post but grant Spott a worldwide, royalty-free license to host, display, and promote it on the Service.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">5. Subscriptions, ads, and billing</h2>
            <p>Paid plans, featured listings, sponsored ads, and add-ons are billed in Canadian dollars and processed through our payment partners. Subscriptions renew automatically until cancelled from your dashboard. Fees already paid are non-refundable except where required by law.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">6. Payment methods</h2>
            <p>Spott accepts major credit and debit cards, Apple Pay, Google Pay, PayPal, and (where supported) Canadian Interac e-Transfer through our processing partners. All transactions are encrypted and tokenized — Spott never stores raw card numbers on its servers. We may add or remove payment methods at any time.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">7. Marketplace orders &amp; escrow (Buyer Protection)</h2>
            <p>All marketplace purchases made through "Add to Cart" are processed in <strong>escrow</strong>, modelled on industry-leading marketplaces. Funds are <strong>held by Spott</strong> and are not released to the seller until:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>the buyer confirms the item was received as described, <em>or</em></li>
              <li>the standard inspection / return window has expired with no open dispute, <em>or</em></li>
              <li>any dispute opened during that window has been resolved.</li>
            </ul>
            <p>Buyers and sellers deal directly with each other for delivery, pickup, and item handover. Spott is a venue and escrow agent — we are not a party to the underlying sale. If a product is returned or refunded under section 8, the corresponding funds are returned to the buyer and any promoter commission tied to that order is reversed.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">8. Returns &amp; refunds</h2>
            <p>Sellers must clearly state their return policy on each listing. Where a return policy is not stated, a default 14-day return window applies for items that are not as described, defective, or never delivered. Refunds are issued from escrowed funds back to the buyer's original payment method. Spott may, at its sole discretion, refund the buyer directly from held funds where a seller fails to respond to a legitimate dispute within 7 days.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">9. Promoter program</h2>
            <p>The Spott Promoter Program is open to verified business owners only. To be approved as a promoter you must:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>hold a <strong>valid Canadian Business Number (BN)</strong> issued by the Canada Revenue Agency and provide it at the time of application;</li>
              <li>be at least 18 years old and legally able to enter into contracts in your province or territory;</li>
              <li>operate a real business and accurately represent Spott in your promotions.</li>
            </ul>
            <p>Due to high volume, applications take <strong>7 to 30 days</strong> to review. Approval is at Spott's sole discretion and may be revoked at any time for breach of these terms.</p>
            <p><strong>Commission &amp; payout timing.</strong> Commissions on referred orders are <em>pending</em> until the underlying sale clears escrow under section 7 — that is, no commission is released until the buyer's return / refund window has closed and the order is finalized. Once cleared, the commission becomes <em>available</em> in your promoter dashboard. Available funds may be cashed out at any time; funds shown as <em>held</em> or <em>pending</em> remain on hold until clearance.</p>
            <p><strong>Reversals.</strong> If the underlying order is refunded, charged back, or reversed for fraud, the related commission is reversed, even if it had already been marked available. Spott may offset reversed amounts against future payouts.</p>
            <p><strong>Tax.</strong> Promoter earnings are gross of tax. You are responsible for collecting and remitting any GST/HST/PST/QST applicable to your services and for declaring promoter income to the CRA.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">10. Fraud prevention &amp; right to hold or refuse payment</h2>
            <p>Spott actively monitors transactions for fraud, abuse, and policy violations. We reserve the right, at our sole discretion and without prior notice, to <strong>hold, delay, refuse, reverse, or refund</strong> any payment, payout, or commission where we reasonably suspect:</p>
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
              <li>solicit payment outside the Spott platform to evade buyer protection, commissions, or platform fees;</li>
              <li>upload malware, attempt to compromise the Service, or probe it for vulnerabilities without written authorization;</li>
              <li>harass, threaten, dox, or defraud other users.</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">12. Seller policies &amp; code of conduct (Amazon-aligned standards)</h2>
            <p>Sellers on the Spott marketplace must meet the same baseline standards used by leading global marketplaces such as Amazon. By listing a product for sale on Spott you agree to the following seller obligations. Spott may suspend listings, hold funds, or terminate seller accounts for any breach.</p>

            <h3 className="mt-4 font-semibold">12.1 Accurate product listings</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Listings must accurately describe the product's condition (new, used, refurbished), brand, model, size, materials, and included accessories.</li>
              <li>Photos must be of the actual item being sold (or a true manufacturer image for new goods). No stock photos for used items.</li>
              <li>No misleading titles, hidden fees, bait-and-switch pricing, or false scarcity claims.</li>
              <li>Pricing must be fair and consistent with the listing — surprise charges at checkout are prohibited.</li>
            </ul>

            <h3 className="mt-4 font-semibold">12.2 Prohibited &amp; restricted products</h3>
            <p>The following may NOT be sold on Spott:</p>
            <ul className="list-disc pl-6 space-y-1">
              <li>Counterfeit, replica, or unauthorized branded goods of any kind;</li>
              <li>Recalled products, unsafe goods, or items failing Canadian safety standards (Health Canada, Transport Canada, CFIA);</li>
              <li>Firearms, ammunition, weapons, explosives, or restricted weapon accessories;</li>
              <li>Illegal drugs, drug paraphernalia, cannabis (outside licensed channels), tobacco, vaping products, or alcohol;</li>
              <li>Prescription medications, medical devices requiring a prescription, or unapproved health claims;</li>
              <li>Adult content, sexually explicit material, or escort services;</li>
              <li>Stolen goods, items lacking proof of ownership, or items obtained through fraud;</li>
              <li>Live animals, human remains, body parts, or bodily fluids;</li>
              <li>Hazardous materials, hazmat, or items restricted by Canada Post / major couriers;</li>
              <li>Digital goods that infringe copyright (pirated software, movies, e-books, accounts, keys);</li>
              <li>Anything illegal to sell, ship, or possess under Canadian federal, provincial, or municipal law.</li>
            </ul>

            <h3 className="mt-4 font-semibold">12.3 Order fulfillment standards</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Sellers must confirm, ship, or arrange pickup within <strong>2 business days</strong> of an order being marked paid.</li>
              <li>Shipped items must include valid tracking where the carrier supports it.</li>
              <li>Late-shipment rate, order-defect rate, and cancellation rate are monitored. Repeated breaches result in suspension.</li>
              <li>Sellers are responsible for accurate inventory — overselling, then cancelling, is treated as an order defect.</li>
            </ul>

            <h3 className="mt-4 font-semibold">12.4 Returns, refunds &amp; A-to-Z style guarantee</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Sellers must honour their stated return policy and, at minimum, accept returns for items that are not as described, defective, damaged in transit, or never delivered.</li>
              <li>Buyers have <strong>up to 30 days from delivery</strong> to request a return for not-as-described or defective items.</li>
              <li>If a seller does not respond to a legitimate dispute within 48 hours, Spott may refund the buyer from escrowed funds at its sole discretion under our <strong>Spott Guarantee</strong> (modelled on the Amazon A-to-Z Guarantee).</li>
              <li>Refunds are paid from funds held in escrow before any payout to the seller.</li>
              <li>Repeated guarantee claims against a seller will affect account standing and may trigger suspension.</li>
            </ul>

            <h3 className="mt-4 font-semibold">12.5 Customer communication</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>All buyer-seller communication must stay on the Spott platform until the order is complete.</li>
              <li>Sellers may not request payment, contact info, or off-platform transactions to bypass escrow or fees.</li>
              <li>Sellers may not pressure, threaten, bribe, or incentivize buyers to remove negative reviews or close disputes.</li>
              <li>Unsolicited marketing emails / SMS to buyers using contact info obtained from an order are prohibited.</li>
            </ul>

            <h3 className="mt-4 font-semibold">12.6 Intellectual property &amp; brand protection</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Sellers warrant they have the legal right to sell each listed product and to use any associated trademarks, logos, and images.</li>
              <li>Spott operates a notice-and-takedown process for rights holders. Verified IP complaints result in immediate removal of the offending listing.</li>
              <li>Repeat infringers will be permanently terminated and may be reported to the affected brand and to authorities.</li>
            </ul>

            <h3 className="mt-4 font-semibold">12.7 Reviews &amp; ratings integrity</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Sellers may not write, solicit, buy, trade, or manipulate reviews — for themselves or against competitors.</li>
              <li>Offering refunds, discounts, gifts, or any incentive in exchange for a review is prohibited.</li>
              <li>Family members, employees, and operators of related accounts may not review the seller's own products.</li>
              <li>Spott uses automated and manual review-fraud detection. Confirmed violations result in listing removal and possible permanent suspension.</li>
            </ul>

            <h3 className="mt-4 font-semibold">12.8 Pricing &amp; fair-pricing policy</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>No price gouging on essentials, emergency supplies, or items in short supply due to a crisis.</li>
              <li>Shipping fees must be reasonable and reflect actual cost — inflated shipping to disguise the true price is prohibited.</li>
              <li>Promotional claims (e.g. "50% off", "lowest price") must be truthful and supported by a genuine reference price.</li>
            </ul>

            <h3 className="mt-4 font-semibold">12.9 Account integrity &amp; one-seller rule</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Each seller may operate one seller account unless given written approval for additional accounts.</li>
              <li>Operating duplicate or related accounts to evade suspension, manipulate ratings, or split fee tiers is prohibited.</li>
              <li>Sellers must keep their legal name, business registration, tax info, and payout details current and accurate.</li>
            </ul>

            <h3 className="mt-4 font-semibold">12.10 Taxes &amp; compliance</h3>
            <ul className="list-disc pl-6 space-y-1">
              <li>Sellers are responsible for collecting, reporting, and remitting all applicable taxes (GST/HST/PST/QST) and for complying with consumer-protection laws in their province/territory.</li>
              <li>Sellers must comply with the Competition Act, Consumer Packaging and Labelling Act, and any product-specific Canadian regulations.</li>
            </ul>

            <h3 className="mt-4 font-semibold">12.11 Enforcement</h3>
            <p>Violations of this Seller Policy may result in any combination of: warning, listing removal, account suspension, permanent termination, withholding or reversal of funds (including completed payouts), denial of future seller applications, and referral to law enforcement or rights holders. Enforcement decisions are at Spott's sole discretion and, where reasonable, the seller will receive notice and an opportunity to appeal to <a className="text-primary hover:underline" href="mailto:hello@spott.ca">hello@spott.ca</a>.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">13. Identity verification</h2>
            <p>Spott may require sellers, promoters, and high-value buyers to verify their identity, business registration, or banking information at any time. We may suspend accounts and hold related funds until verification is completed to our satisfaction.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">14. Chargebacks</h2>
            <p>If a buyer initiates a chargeback through their bank or card network instead of using Spott's dispute process, the related funds will be held pending the chargeback outcome. Sellers may be debited the chargeback amount plus a processing fee. Repeated chargeback fraud will result in permanent account termination and may be reported to the relevant authorities.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">15. Intellectual property</h2>
            <p>Spott, the Spott name and logo, and the platform code are owned by us. You may not copy, modify, reverse-engineer, or create derivative works of the Service without prior written permission.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">16. Disclaimer</h2>
            <p>The Service is provided "as is" without warranties of any kind. Spott is a venue and does not manufacture, ship, or warrant any product sold on the marketplace. We do not guarantee the accuracy of listings, reviews, or hours. Always verify directly with the business or seller.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">17. Limitation of liability</h2>
            <p>To the maximum extent permitted by law, Spott and its operators are not liable for indirect, incidental, special, or consequential damages arising from your use of the Service. Our aggregate liability for any claim is limited to the greater of (a) the fees you paid Spott in the 3 months preceding the claim, or (b) CAD $100.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">18. Indemnification</h2>
            <p>You agree to indemnify and hold Spott, its directors, employees, and partners harmless from any claim, loss, or expense (including reasonable legal fees) arising from your listings, products, content, promoter activity, or breach of these terms.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">19. Termination</h2>
            <p>We may suspend or terminate any account that violates these terms, with or without notice. On termination, pending escrowed funds for legitimate completed orders will be released to the appropriate party once the standard hold period has elapsed; funds tied to fraud, chargebacks, or unresolved disputes may be retained as described in section 10.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">20. Governing law</h2>
            <p>These terms are governed by the laws of the Province of Ontario and the federal laws of Canada applicable therein. The parties submit to the exclusive jurisdiction of the courts of Ontario.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">21. Changes</h2>
            <p>We may update these terms. Material changes will be highlighted on this page with a new "Last updated" date. Continued use of the Service after a change constitutes acceptance of the new terms.</p>
          </section>

          <section>
            <h2 className="font-display text-lg font-semibold">22. Contact</h2>
            <p>Questions about these terms or to report fraud: <a className="text-primary hover:underline" href="mailto:hello@spott.ca">hello@spott.ca</a>.</p>
          </section>

        </article>
      </main>
    </div>
  );
}
