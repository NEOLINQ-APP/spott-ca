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
  if (!isAdmin) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-6 text-center">
        <div>
          <ShieldCheck className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
          <h1 className="text-xl font-semibold">Zeus is admin-only</h1>
          <p className="mt-1 text-sm text-muted-foreground">Your account doesn't have access to God Mode.</p>
        </div>
      </div>
    );
  }

