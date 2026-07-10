import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRoles } from "@/hooks/use-roles";

export const Route = createFileRoute("/zeus")({
  component: ZeusPage,
  head: () => ({
    meta: [
      { title: "Zeus — God Mode" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "theme-color", content: "#0a0a0a" },
    ],
  }),
});

function ZeusPage() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: rolesLoading } = useRoles();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  if (authLoading || rolesLoading) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return (
    <div className="container max-w-5xl p-8 space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Zeus God Mode</h1>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <a
          href="/zeus/social"
          className="rounded-xl border border-border bg-card p-5 hover:border-primary hover:shadow-md transition"
        >
          <div className="text-sm font-semibold">Social Media Automator</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Generate on-brand posts for Instagram/TikTok, LinkedIn, and X from any listing or category.
          </div>
        </a>
      </div>
    </div>
  );
}
