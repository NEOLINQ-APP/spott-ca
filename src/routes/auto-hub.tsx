import { createFileRoute, redirect } from "@tanstack/react-router";

// Alias: /auto-hub → /vehicles (canonical). Spott is one unified platform.
export const Route = createFileRoute("/auto-hub")({
  beforeLoad: ({ search }) => {
    throw redirect({ to: "/vehicles", search: search as never });
  },
});
