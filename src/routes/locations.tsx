// Layout for /locations and /locations/$province — the index content used
// to live directly here, but locations.$province.tsx being a sibling dot-file
// makes this file the LAYOUT ancestor (same convention as vehicles.tsx +
// vehicles.index.tsx + vehicles.browse.tsx): it must render <Outlet/>, or
// the child route's content never actually appears (confirmed live —
// /locations/alberta was silently rendering this file's own content
// instead of the province page, before the index content moved out to
// locations.index.tsx).
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { SiteHeader } from "@/components/site-header";

export const Route = createFileRoute("/locations")({
  component: LocationsLayout,
});

function LocationsLayout() {
  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Outlet />
    </div>
  );
}
