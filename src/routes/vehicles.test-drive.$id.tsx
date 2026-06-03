import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getVehicle } from "@/lib/vehicles.functions";
import { CalendarCheck, ArrowLeft } from "lucide-react";
import { LeadForm } from "@/components/vehicles/LeadForm";

export const Route = createFileRoute("/vehicles/test-drive/$id")({
  component: TestDrivePage,
  head: () => ({
    meta: [
      { title: "Book a Test Drive — Spott Vehicles" },
      { name: "description", content: "Book a test drive for a vehicle listed on Spott." },
    ],
  }),
});

function TestDrivePage() {
  const { id } = useParams({ from: "/vehicles/test-drive/$id" });
  const fetchVehicle = useServerFn(getVehicle);
  const [v, setV] = useState<any>(null);

  useEffect(() => {
    let cancelled = false;
    fetchVehicle({ data: { id } }).then((d) => { if (!cancelled) setV(d); }).catch(() => {});
    return () => { cancelled = true; };
  }, [id, fetchVehicle]);

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link to="/vehicles/$id" params={{ id }} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to vehicle
      </Link>
      <div className="mt-4 text-center">
        <CalendarCheck className="mx-auto h-10 w-10 text-primary" />
        <h1 className="mt-3 font-display text-3xl font-semibold">Book a Test Drive</h1>
        {v ? (
          <p className="mt-2 text-sm text-muted-foreground">For <span className="font-medium text-foreground">{v.title}</span></p>
        ) : (
          <p className="mt-2 text-sm text-muted-foreground">Pick a time that works for you.</p>
        )}
      </div>
      <div className="mt-6">
        <LeadForm leadType="test_drive" vehicleId={id} showSchedule submitLabel="Request test drive" />
      </div>
    </div>
  );
}
