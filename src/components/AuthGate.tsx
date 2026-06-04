import { Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import type { ReactNode } from "react";

type Props = {
  redirectTo: string;
  title?: string;
  description?: string;
  backTo?: string;
  backLabel?: string;
  children: ReactNode;
};

export function AuthGate({
  redirectTo,
  title = "Sign in to view this listing",
  description = "Create a free account or sign in to see full details, photos, and contact information.",
  backTo,
  backLabel = "← Go back",
  children,
}: Props) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }

  if (!user) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
        <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <Lock className="mx-auto h-10 w-10 text-primary" />
          <h1 className="mt-4 font-display text-2xl font-semibold">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
          <div className="mt-6 flex flex-col gap-2">
            <Link
              to="/auth"
              search={{ redirect: redirectTo } as any}
              className="inline-flex w-full items-center justify-center rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Sign in or create account
            </Link>
            {backTo && (
              <Link to={backTo} className="text-sm text-muted-foreground hover:text-foreground">
                {backLabel}
              </Link>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
