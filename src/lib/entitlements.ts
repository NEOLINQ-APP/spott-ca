// Tier definitions for Spott. Keyed by Stripe lookup_key (stable sandbox↔live).
export type Tier = "free" | "pro" | "business";

export const TIER_BY_PRICE: Record<string, Tier> = {
  spott_pro_monthly: "pro",
  spott_business_monthly: "business",
};

export const TIER_RANK: Record<Tier, number> = { free: 0, pro: 1, business: 2 };

export const TIER_LIMITS = {
  free: { photoCap: 4, monthlyBumpUps: 0, specials: 1, featuredHomepage: false, analytics: false, reply: false },
  pro: { photoCap: 15, monthlyBumpUps: 2, specials: 5, featuredHomepage: false, analytics: true, reply: true },
  business: { photoCap: 999, monthlyBumpUps: 8, specials: 999, featuredHomepage: true, analytics: true, reply: true },
} as const;

export function tierFromPriceId(priceId?: string | null): Tier {
  if (!priceId) return "free";
  return TIER_BY_PRICE[priceId] ?? "free";
}

export const PLANS = [
  {
    tier: "free" as const,
    name: "Free",
    price: 0,
    priceId: null,
    blurb: "Get listed and start collecting reviews.",
    features: [
      "1 listing",
      "Up to 4 review photos",
      "Basic profile",
      "Customer reviews",
    ],
  },
  {
    tier: "pro" as const,
    name: "Pro",
    price: 19,
    priceId: "spott_pro_monthly",
    blurb: "For growing local businesses.",
    features: [
      "Up to 15 photos per listing",
      "Category-featured placement",
      "2 free bump-ups / month",
      "Reply to reviews",
      "Up to 5 active specials",
      "Visitor analytics",
    ],
  },
  {
    tier: "business" as const,
    name: "Business",
    price: 49,
    priceId: "spott_business_monthly",
    blurb: "Maximum visibility on Spott.",
    features: [
      "Unlimited photos",
      "Homepage + category featuring",
      "8 free bump-ups / month",
      "Unlimited specials",
      "Priority support",
      "Full analytics dashboard",
    ],
  },
];

export const ADDONS = [
  { id: "spott_bump_up_once", name: "Single bump-up", price: 3, blurb: "Top of category for 24h." },
  { id: "spott_photo_pack_once", name: "+10 photo pack", price: 5, blurb: "Add 10 more photos to a listing." },
  { id: "spott_feature_7d_once", name: "7-day homepage feature", price: 15, blurb: "Featured on Spott homepage." },
];
