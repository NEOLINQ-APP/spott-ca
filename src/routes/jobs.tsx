import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EMPLOYMENT_TYPES, LOCATION_TYPES, employmentTypeLabel, locationTypeLabel, fmtSalary, fmtPostedDate } from "@/lib/jobs";
import { Briefcase, MapPin, DollarSign, PlusCircle } from "lucide-react";

export const Route = createFileRoute("/jobs")({
  component: JobsPage,
  head: () => ({
    meta: [
      { title: "Jobs — Spott" },
      { name: "description", content: "Find your next job across Canada — full-time, part-time, contract, and remote roles." },
      { property: "og:title", content: "Jobs — Spott" },
      { property: "og:description", content: "Post and find jobs on Spott." },
    ],
    links: [{ rel: "canonical", href: "https://www.spott.ca/jobs" }],
  }),
});

type JobRow = {
  id: string;
  title: string;
  company_name: string;
  employment_type: string;
  location_type: string;
  city: string | null;
  province: string | null;
  salary_min_cents: number | null;
  salary_max_cents: number | null;
  salary_period: string;
  created_at: string;
};

function JobsPage() {
  const [rows, setRows] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [employmentType, setEmploymentType] = useState("");
  const [locationType, setLocationType] = useState("");
  const [city, setCity] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      let query = supabase
        .from("job_postings")
        .select("id,title,company_name,employment_type,location_type,city,province,salary_min_cents,salary_max_cents,salary_period,created_at")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(60);
      if (employmentType) query = query.eq("employment_type", employmentType);
      if (locationType) query = query.eq("location_type", locationType);
      if (city) query = query.ilike("city", `%${city}%`);
      if (q) query = query.or(`title.ilike.%${q.replace(/[%_]/g, "\\$&")}%,company_name.ilike.%${q.replace(/[%_]/g, "\\$&")}%`);
      const { data } = await query;
      if (!cancelled) {
        setRows((data ?? []) as JobRow[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [q, employmentType, locationType, city]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Jobs</h1>
          <p className="text-sm text-muted-foreground">Full-time, part-time, contract, and remote roles across Canada.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/jobs/favorites" className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs font-medium hover:bg-muted">
            Saved jobs
          </Link>
          <Link to="/jobs/new" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            <PlusCircle className="h-3.5 w-3.5" /> Post a job
          </Link>
        </div>
      </div>

      <div className="mt-5 grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-4">
        <input className="rounded-md border border-border bg-background p-2 text-sm sm:col-span-2" placeholder="Search job title or company…" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="rounded-md border border-border bg-background p-2 text-sm" value={employmentType} onChange={(e) => setEmploymentType(e.target.value)}>
          <option value="">All types</option>
          {EMPLOYMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select className="rounded-md border border-border bg-background p-2 text-sm" value={locationType} onChange={(e) => setLocationType(e.target.value)}>
          <option value="">On-site or remote</option>
          {LOCATION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <input className="rounded-md border border-border bg-background p-2 text-sm sm:col-span-4" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
      </div>

      {loading ? (
        <div className="mt-10 text-center text-sm text-muted-foreground">Loading jobs…</div>
      ) : rows.length === 0 ? (
        <div className="mt-10 rounded-2xl border border-dashed border-border p-12 text-center text-sm text-muted-foreground">
          No jobs match your search. <Link to="/jobs/new" className="text-primary hover:underline">Be the first to post one</Link>.
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {rows.map((j) => (
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
              <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" /> {locationTypeLabel(j.location_type)}{j.city ? ` · ${j.city}${j.province ? ", " + j.province : ""}` : ""}</span>
                <span className="inline-flex items-center gap-1"><DollarSign className="h-3 w-3" /> {fmtSalary(j.salary_min_cents, j.salary_max_cents, j.salary_period)}</span>
                <span className="inline-flex items-center gap-1"><Briefcase className="h-3 w-3" /> {fmtPostedDate(j.created_at)}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
