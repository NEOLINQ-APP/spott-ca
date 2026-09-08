import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { employmentTypeLabel, fmtSalary } from "@/lib/jobs";
import { Heart, Briefcase } from "lucide-react";

export const Route = createFileRoute("/jobs/favorites")({
  component: JobFavoritesPage,
});

type JobRow = {
  id: string;
  title: string;
  company_name: string;
  employment_type: string;
  salary_min_cents: number | null;
  salary_max_cents: number | null;
  salary_period: string;
};

function JobFavoritesPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data: favs } = await supabase
        .from("job_favorites")
        .select("job_id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      const ids = (favs ?? []).map((f: any) => f.job_id);
      if (!ids.length) {
        setJobs([]);
        setLoading(false);
        return;
      }
      const { data: js } = await supabase
        .from("job_postings")
        .select("id,title,company_name,employment_type,salary_min_cents,salary_max_cents,salary_period")
        .in("id", ids);
      if (!cancel) setJobs((js ?? []) as JobRow[]);
      setLoading(false);
    })();
    return () => {
      cancel = true;
    };
  }, [user]);

  if (!authLoading && !user) {
    navigate({ to: "/auth" });
    return null;
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="font-display text-3xl font-semibold tracking-tight">Saved jobs</h1>

      {loading ? (
        <div className="mt-6 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-20 animate-pulse rounded-xl bg-card" />)}
        </div>
      ) : jobs.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center">
          <Heart className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-4 text-sm text-muted-foreground">No saved jobs yet.</p>
          <Link to="/jobs" className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
            Browse jobs
          </Link>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {jobs.map((j) => (
            <Link key={j.id} to="/jobs/$id" params={{ id: j.id }} className="block rounded-xl border border-border bg-card p-4 transition hover:border-primary/40">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold">{j.title}</div>
                  <div className="text-sm text-muted-foreground">{j.company_name}</div>
                </div>
                <span className="shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide">
                  {employmentTypeLabel(j.employment_type)}
                </span>
              </div>
              <div className="mt-2 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Briefcase className="h-3 w-3" /> {fmtSalary(j.salary_min_cents, j.salary_max_cents, j.salary_period)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
