import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { SiteHeader } from "@/components/site-header";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

const processUnsubscribe = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const { unsubscribeByToken } = await import("@/lib/suppression.server");
    return unsubscribeByToken(data.token);
  });

export const Route = createFileRoute("/unsubscribe/$token")({
  component: UnsubscribePage,
  head: () => ({ meta: [{ title: "Unsubscribe — Spott.ca" }, { name: "robots", content: "noindex,nofollow" }] }),
});

function UnsubscribePage() {
  const { token } = Route.useParams();
  const fn = useServerFn(processUnsubscribe);
  const [state, setState] = useState<"loading" | "done" | "invalid">("loading");

  useEffect(() => {
    fn({ data: { token } })
      .then((res) => setState(res.ok ? "done" : "invalid"))
      .catch(() => setState("invalid"));
  }, [token, fn]);

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-md px-6 py-20 text-center">
        {state === "loading" && <Loader2 className="mx-auto h-8 w-8 animate-spin text-muted-foreground" />}
        {state === "done" && (
          <>
            <CheckCircle2 className="mx-auto h-10 w-10 text-primary" />
            <h1 className="mt-4 font-display text-xl font-semibold">You're unsubscribed</h1>
            <p className="mt-2 text-sm text-muted-foreground">You won't receive any more emails from this list.</p>
          </>
        )}
        {state === "invalid" && (
          <>
            <XCircle className="mx-auto h-10 w-10 text-muted-foreground" />
            <h1 className="mt-4 font-display text-xl font-semibold">Link not valid</h1>
            <p className="mt-2 text-sm text-muted-foreground">This unsubscribe link may have already been used.</p>
          </>
        )}
      </div>
    </div>
  );
}
