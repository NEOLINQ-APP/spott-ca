// REST: /api/business-plans
// GET → Spott.ca's real business-directory listing plans (public, no auth).
// Mirrors the PLANS array in src/routes/pricing.tsx (the actual pricing
// page) -- kept as a separate flat data file rather than importing from
// that route module so a phone-line/voice-AI consumer (BARIO's Victoria)
// has a stable, dependency-free JSON source. If pricing.tsx's numbers ever
// change, update this file too.
import { createFileRoute } from "@tanstack/react-router";
import { jsonResponse } from "@/lib/api/http.server";

const BUSINESS_PLANS = [
  {
    tier: "free",
    name: "Free",
    priceMonthlyCad: 0,
    blurb: "Get listed on Canada's modern business directory.",
    features: ["Basic profile", "Contact information", "Photos", "Business description"],
  },
  {
    tier: "featured",
    name: "Featured Business",
    priceMonthlyCad: 19,
    futurePriceNote: "Introductory price -- listed future price is $29-$39/mo once the Founding Member window closes.",
    blurb: "Stand out and get seen by more local customers.",
    features: ["Everything in Free", "Featured placement", "Priority search ranking", "Featured badge"],
  },
  {
    tier: "pro",
    name: "Business Pro",
    priceMonthlyCad: 49,
    futurePriceNote: "Introductory price -- listed future price is $79-$99/mo once the Founding Member window closes.",
    blurb: "Built for growing Canadian businesses.",
    features: ["Everything in Featured", "Advanced analytics", "Videos on your profile", "Promotions", "Events", "Lead tracking"],
  },
  {
    tier: "enterprise",
    name: "Enterprise",
    priceMonthlyCad: 149,
    futurePriceNote: "Introductory price -- listed future price is $249-$499/mo once the Founding Member window closes.",
    blurb: "For multi-location brands, franchises and large operators.",
    features: ["Everything in Business Pro", "Multiple locations", "Advanced marketing tools", "Premium placement", "Dedicated account support"],
  },
];

const FOUNDING_MEMBER_OFFER =
  "Every paid plan (Featured Business, Business Pro, Enterprise) currently includes a 90-day free trial for new Founding Members -- no charge today, a payment method is required at signup, and whatever price they start at is locked in for life even as list prices rise later. Enterprise is 'talk to sales' rather than self-serve checkout. One-time add-ons (boosts, photo packs, homepage features) are purchased per listing from the dashboard's Boost panel, not part of the monthly plan price.";

const DEALER_PLANS_NOTE =
  "Spott.ca also has a separate vehicle-dealer subscription program (for car/RV/boat dealers listing inventory) with its own plans and a Founding Dealer discount -- real-time pricing for that is available at /api/subscriptions/plans, not this endpoint.";

export const Route = createFileRoute("/api/business-plans")({
  server: {
    handlers: {
      GET: async () =>
        jsonResponse({
          plans: BUSINESS_PLANS,
          foundingMemberOffer: FOUNDING_MEMBER_OFFER,
          dealerPlansNote: DEALER_PLANS_NOTE,
        }),
    },
  },
});
