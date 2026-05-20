import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2 } from "lucide-react";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/checkout/return")({
  validateSearch: (s: Record<string, unknown>): { session_id?: string } => ({
    session_id: typeof s.session_id === "string" ? s.session_id : undefined,
  }),
  component: CheckoutReturn,
});

function CheckoutReturn() {
  const { session_id } = Route.useSearch();
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <CheckCircle2 className="mx-auto h-12 w-12 text-primary" />
        <h1 className="mt-4 font-display text-3xl font-semibold">Payment received</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {session_id
            ? "Your subscription is being activated — it usually appears in your dashboard within a few seconds."
            : "We couldn't find a session reference, but your payment may have still gone through."}
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link to="/dashboard" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Go to dashboard
          </Link>
          <Link to="/pricing" className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent/10">
            View plans
          </Link>
        </div>
      </div>
    </div>
  );
}
