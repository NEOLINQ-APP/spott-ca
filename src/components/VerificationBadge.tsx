import { BadgeCheck, ShieldCheck, Home, Star, Crown, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type VerificationBadgeType =
  | "verified-business"
  | "verified-dealer"
  | "verified-realtor"
  | "featured-business"
  | "trusted-seller"
  | "premium-member";

type Size = "sm" | "md" | "lg";

interface VerificationBadgeProps {
  type: VerificationBadgeType;
  size?: Size;
  className?: string;
  /** Hide the text label, show icon-only (with tooltip) */
  iconOnly?: boolean;
}

const CONFIG: Record<
  VerificationBadgeType,
  { label: string; Icon: typeof BadgeCheck; classes: string }
> = {
  "verified-business": {
    label: "Verified Business",
    Icon: BadgeCheck,
    classes:
      "border-sky-500/30 bg-sky-500/10 text-sky-600 dark:text-sky-300",
  },
  "verified-dealer": {
    label: "Verified Dealer",
    Icon: ShieldCheck,
    classes:
      "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  },
  "verified-realtor": {
    label: "Verified Realtor",
    Icon: Home,
    classes:
      "border-violet-500/30 bg-violet-500/10 text-violet-600 dark:text-violet-300",
  },
  "trusted-seller": {
    label: "Trusted Seller",
    Icon: Star,
    classes:
      "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  "premium-member": {
    label: "Premium Member",
    Icon: Crown,
    classes:
      "border-fuchsia-500/30 bg-gradient-to-r from-fuchsia-500/15 to-pink-500/10 text-fuchsia-600 dark:text-fuchsia-300",
  },
  "featured-business": {
    label: "Featured Business",
    Icon: Sparkles,
    classes:
      "border-amber-500/40 bg-gradient-to-r from-amber-400/20 to-orange-400/15 text-amber-700 dark:text-amber-300",
  },
};

const SIZE_CLASSES: Record<Size, string> = {
  sm: "px-1.5 py-0.5 text-[10px] gap-1",
  md: "px-2 py-0.5 text-xs gap-1",
  lg: "px-2.5 py-1 text-sm gap-1.5",
};

const ICON_SIZE: Record<Size, string> = {
  sm: "h-3 w-3",
  md: "h-3.5 w-3.5",
  lg: "h-4 w-4",
};

export function VerificationBadge({
  type,
  size = "md",
  className,
  iconOnly = false,
}: VerificationBadgeProps) {
  const cfg = CONFIG[type];
  const Icon = cfg.Icon;
  return (
    <span
      title={cfg.label}
      aria-label={cfg.label}
      className={cn(
        "inline-flex items-center rounded-full border font-medium whitespace-nowrap",
        cfg.classes,
        SIZE_CLASSES[size],
        className,
      )}
    >
      <Icon className={ICON_SIZE[size]} />
      {!iconOnly && cfg.label}
    </span>
  );
}

/**
 * Derive which verification badges to show for a business-like record.
 * Order is meaningful: callers can render the first match or all matches.
 */
export function getBusinessBadges(b: {
  is_claimed?: boolean | null;
  status?: string | null;
  business_type?: string | null;
  featured_until?: string | Date | null;
}): VerificationBadgeType[] {
  const badges: VerificationBadgeType[] = [];
  const claimed = b.is_claimed === true;
  const active = b.status === "active" || b.status === "verified";
  const type = (b.business_type || "").toLowerCase();

  if (claimed && active) {
    if (type === "dealer" || type === "dealership") badges.push("verified-dealer");
    else if (type === "realtor" || type === "real_estate" || type === "realty")
      badges.push("verified-realtor");
    else badges.push("verified-business");
  }

  const featured =
    b.featured_until && new Date(b.featured_until).getTime() > Date.now();
  if (featured) badges.push("featured-business");

  return badges;
}
