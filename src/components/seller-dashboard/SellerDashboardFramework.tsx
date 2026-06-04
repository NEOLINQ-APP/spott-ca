import { type ReactNode, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, User } from "lucide-react";

// ============================================================================
// Shared seller-dashboard framework.
// ----------------------------------------------------------------------------
// All seller dashboards (private + dealer) render through this single shell so
// tools stay consistent. Which tools appear is purely a function of
// `sellerType` — pass a different tools array, get a different dashboard.
// Adding a future seller variant means adding a tools list, not a new layout.
// ============================================================================

export interface SellerTool {
  id: string;
  label: string;
  icon: ReactNode;
  component: ReactNode;
  /** Optional pill shown on the tab (e.g. "Soon") */
  badge?: string;
}

export interface SellerDashboardProps {
  sellerType: "private" | "dealer";
  sellerName?: string | null;
  tools: SellerTool[];
}

export function SellerDashboardFramework({
  sellerType,
  sellerName,
  tools,
}: SellerDashboardProps) {
  const [active, setActive] = useState<string>(tools[0]?.id ?? "");
  if (tools.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
        <div
          className={`grid h-10 w-10 place-items-center rounded-full ${
            sellerType === "dealer" ? "bg-primary/15 text-primary" : "bg-secondary"
          }`}
        >
          {sellerType === "dealer" ? (
            <ShieldCheck className="h-5 w-5" />
          ) : (
            <User className="h-5 w-5" />
          )}
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium">
            {sellerType === "dealer" ? "Dealer Dashboard" : "Private Seller Dashboard"}
          </div>
          <div className="text-xs text-muted-foreground">
            {sellerType === "dealer"
              ? `Managing ${sellerName ?? "your dealership"} on Spott`
              : "Your personal selling tools"}
          </div>
        </div>
        <Badge variant={sellerType === "dealer" ? "default" : "secondary"}>
          {sellerType === "dealer" ? "Verified Dealer" : "Private Seller"}
        </Badge>
      </div>

      <Tabs value={active} onValueChange={setActive}>
        <TabsList className="flex flex-wrap h-auto">
          {tools.map((t) => (
            <TabsTrigger key={t.id} value={t.id} className="gap-1">
              <span className="inline-flex items-center gap-1">
                {t.icon}
                {t.label}
              </span>
              {t.badge && (
                <span className="ml-1 rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide">
                  {t.badge}
                </span>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        {tools.map((t) => (
          <TabsContent key={t.id} value={t.id} className="mt-4">
            {t.component}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
