import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listDealerPlans, startDealerTrial, getDealerOverview } from "@/lib/dealer.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Check, Loader2, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/dealer/plans")({ component: DealerPlansPage });

function fmtMoney(cents: number) {
  if (cents === 0) return "Free";
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(
    cents / 100,
  );
}

function DealerPlansPage() {
  const fetchPlans = useServerFn(listDealerPlans);
  const fetchOverview = useServerFn(getDealerOverview);
  const startTrial = useServerFn(startDealerTrial);
  const qc = useQueryClient();

  const [interval, setInterval] = useState<"monthly" | "yearly">("monthly");
  const [businessId, setBusinessId] = useState<string>("");
  const [submittingPlan, setSubmittingPlan] = useState<string | null>(null);

  const plans = useQuery({ queryKey: ["dealer-plans"], queryFn: () => fetchPlans() });
  const overview = useQuery({ queryKey: ["dealer-overview"], queryFn: () => fetchOverview() });

  const businesses = overview.data?.businesses ?? [];
  const activeSub = overview.data?.subscriptions?.find((s: any) =>
    ["active", "trialing"].includes(s.status),
  );

  if (businessId === "" && businesses.length > 0) {
    setBusinessId(businesses[0].id);
  }

  async function handleStart(planId: string) {
    if (!businessId) {
      toast.error("Add a dealership profile first.");
      return;
    }
    setSubmittingPlan(planId);
    try {
      await startTrial({
        data: {
          business_id: businessId,
          plan_id: planId,
          billing_interval: interval,
          is_founding_dealer: true,
        },
      });
      toast.success("Founding Dealer trial started — 90 days free, price locked.");
      qc.invalidateQueries({ queryKey: ["dealer-overview"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Couldn't start trial");
    } finally {
      setSubmittingPlan(null);
    }
  }

  if (plans.isLoading || overview.isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading plans…
      </div>
    );
  }

  const list = plans.data?.plans ?? [];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <div className="flex items-center gap-2 text-primary font-semibold">
          <Sparkles className="h-4 w-4" /> Founding Dealer Program
        </div>
        <p className="mt-1 text-sm text-foreground/90">
          90-day free trial on every plan. Founding Dealers lock in a discounted rate that
          renews at the same price for life — no future increases.
        </p>
      </div>

      <Card className="p-4 flex flex-wrap items-end gap-4">
        {businesses.length > 1 && (
          <div>
            <label className="text-xs text-muted-foreground">Dealership</label>
            <Select value={businessId} onValueChange={setBusinessId}>
              <SelectTrigger className="w-[260px]"><SelectValue/></SelectTrigger>
              <SelectContent>
                {businesses.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        <div>
          <label className="text-xs text-muted-foreground">Billing</label>
          <Select value={interval} onValueChange={(v) => setInterval(v as any)}>
            <SelectTrigger className="w-[180px]"><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly (2 months free)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {activeSub && (
          <Badge variant="outline" className="ml-auto">
            Current: {activeSub.plan?.name} · {activeSub.status}
          </Badge>
        )}
      </Card>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {list.map((p: any) => {
          const price = interval === "monthly" ? p.monthly_price_cents : p.yearly_price_cents;
          const discount = p.founding_member_discount_pct ?? 0;
          const locked = Math.round(price * (1 - discount / 100));
          const isCurrent = activeSub?.plan_id === p.id;
          return (
            <Card key={p.id} className="p-5 flex flex-col">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{p.name}</h3>
                {isCurrent && <Badge>Current</Badge>}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>

              <div className="mt-4">
                {discount > 0 && price > 0 && (
                  <div className="text-xs text-muted-foreground line-through">
                    {fmtMoney(price)} / {interval === "monthly" ? "mo" : "yr"}
                  </div>
                )}
                <div className="text-2xl font-bold">
                  {fmtMoney(locked)}
                  {locked > 0 && (
                    <span className="text-sm font-normal text-muted-foreground">
                      {" "}/ {interval === "monthly" ? "mo" : "yr"}
                    </span>
                  )}
                </div>
                {discount > 0 && price > 0 && (
                  <div className="mt-1 inline-flex items-center gap-1 text-xs text-primary">
                    <Lock className="h-3 w-3" /> Founding Dealer · {discount}% off forever
                  </div>
                )}
              </div>

              <ul className="mt-4 space-y-1.5 text-sm flex-1">
                <Feature on={true}>
                  {p.inventory_limit == null ? "Unlimited vehicles" : `Up to ${p.inventory_limit} vehicles`}
                </Feature>
                <Feature on={true}>{p.photo_quota_per_vehicle ?? 5} photos / vehicle</Feature>
                <Feature on={p.video_uploads}>Video uploads</Feature>
                <Feature on={p.analytics_access}>Analytics</Feature>
                <Feature on={p.lead_management}>Lead tracking</Feature>
                <Feature on={p.featured_placement}>Featured placement</Feature>
                <Feature on={p.multi_location_support}>Multi-location support</Feature>
                <Feature on={p.inventory_feed_imports}>Inventory feed imports</Feature>
                <Feature on={p.api_access}>API access</Feature>
                <Feature on={p.priority_support}>Priority support</Feature>
              </ul>

              <Button
                className="mt-5"
                disabled={!businessId || submittingPlan === p.id || isCurrent}
                onClick={() => handleStart(p.id)}
              >
                {submittingPlan === p.id ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin"/>Starting…</>
                ) : isCurrent ? (
                  "Current plan"
                ) : (
                  `Start 90-day free trial`
                )}
              </Button>
              <p className="mt-2 text-[11px] text-muted-foreground text-center">
                Payment method required at trial signup · cancel anytime · auto-renews after trial
              </p>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function Feature({ on, children }: { on: boolean; children: React.ReactNode }) {
  return (
    <li className={`flex items-start gap-2 ${on ? "" : "text-muted-foreground/50 line-through"}`}>
      <Check className={`h-4 w-4 mt-0.5 ${on ? "text-primary" : "text-muted-foreground/40"}`} />
      <span>{children}</span>
    </li>
  );
}
