import { Link } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";
import { Sparkles, ArrowRight } from "lucide-react";

export function ComingSoonVertical({
  title,
  tagline,
  description,
}: {
  title: string;
  tagline: string;
  description: string;
}) {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center shadow-sm">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Coming soon
          </div>
          <h1 className="mt-4 font-display text-4xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-3 text-base text-muted-foreground">{tagline}</p>
          <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">{description}</p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Link
              to="/directory"
              className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Browse what's live <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              to="/contact"
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent/10"
            >
              Get notified
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
