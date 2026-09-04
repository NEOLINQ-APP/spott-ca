// Superseded by the Phase 2 application wizard (vehicles.apply.tsx) —
// kept as a redirect so any existing links/bookmarks to the old Phase 1
// financing-inquiry page still work. The old simple form here bypassed
// consent capture, vehicle/financing detail, and Bario sync — the new
// wizard is the one real submission path now.
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/vehicles/financing/$id")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/vehicles/apply", search: { vehicle_id: params.id } as never });
  },
});
