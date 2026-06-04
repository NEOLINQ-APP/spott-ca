import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMySellerProfile } from "@/lib/vehicles.functions";
import {
  SellerDashboardFramework,
  type SellerTool,
} from "./SellerDashboardFramework";
import {
  PrivateMyListingsPanel,
  PrivateSavedListingsPanel,
  PrivatePerformancePanel,
} from "./PrivatePanels";
import {
  DealerInventoryPanel,
  DealerLeadsPanel,
  DealerSubscriptionPanel,
  DealerFeaturedPanel,
  DealerAnalyticsPanel,
} from "./DealerPanels";
import { MessagesPanel } from "@/components/MessagesPanel";
import {
  Tag,
  MessageSquare,
  Heart,
  BarChart3,
  Car,
  Inbox,
  Crown,
  Star,
} from "lucide-react";

/**
 * Single entry point used by /dashboard. seller_type drives the tool list —
 * everything else is shared (header, tabs shell, layout). A new seller
 * variant in the future just needs a new tools array here.
 */
export function SellerDashboard() {
  const fetchProfile = useServerFn(getMySellerProfile);
  const { data, isLoading } = useQuery({
    queryKey: ["seller-profile"],
    queryFn: () => fetchProfile({}),
    staleTime: 5 * 60_000,
  });

  if (isLoading) {
    return <div className="h-64 animate-pulse rounded-2xl bg-card/60" />;
  }

  const sellerType: "private" | "dealer" = data?.type ?? "private";
  const dealer = data?.dealer ?? null;

  const tools: SellerTool[] =
    sellerType === "dealer"
      ? [
          {
            id: "inventory",
            label: "Inventory",
            icon: <Car className="h-4 w-4" />,
            component: <DealerInventoryPanel dealer={dealer} />,
          },
          {
            id: "leads",
            label: "Leads",
            icon: <Inbox className="h-4 w-4" />,
            component: <DealerLeadsPanel />,
          },
          {
            id: "subscription",
            label: "Subscription",
            icon: <Crown className="h-4 w-4" />,
            component: <DealerSubscriptionPanel />,
          },
          {
            id: "featured",
            label: "Featured",
            icon: <Star className="h-4 w-4" />,
            component: <DealerFeaturedPanel />,
          },
          {
            id: "analytics",
            label: "Analytics",
            icon: <BarChart3 className="h-4 w-4" />,
            component: <DealerAnalyticsPanel />,
            badge: "Soon",
          },
        ]
      : [
          {
            id: "my-listings",
            label: "My Listings",
            icon: <Tag className="h-4 w-4" />,
            component: <PrivateMyListingsPanel />,
          },
          {
            id: "messages",
            label: "Messages",
            icon: <MessageSquare className="h-4 w-4" />,
            component: <MessagesPanel role="customer" />,
          },
          {
            id: "saved",
            label: "Saved",
            icon: <Heart className="h-4 w-4" />,
            component: <PrivateSavedListingsPanel />,
          },
          {
            id: "performance",
            label: "Performance",
            icon: <BarChart3 className="h-4 w-4" />,
            component: <PrivatePerformancePanel />,
          },
        ];

  return (
    <SellerDashboardFramework
      sellerType={sellerType}
      sellerName={dealer?.name ?? null}
      tools={tools}
    />
  );
}
