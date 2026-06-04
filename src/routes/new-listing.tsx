import { createFileRoute, redirect } from "@tanstack/react-router";

// Legacy route — permanently redirects to the new canonical /business/new URL.
export const Route = createFileRoute("/new-listing")({
  beforeLoad: () => {
    throw redirect({ to: "/business/new", replace: true });
  },
});
