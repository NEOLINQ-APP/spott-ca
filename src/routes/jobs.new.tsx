import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { EMPLOYMENT_TYPES, LOCATION_TYPES } from "@/lib/jobs";
import { PROVINCES } from "@/lib/canada";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";

export const Route = createFileRoute("/jobs/new")({
  component: NewJobPage,
});

function NewJobPage() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [companyName, setCompanyName] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [benefits, setBenefits] = useState("");
  const [employmentType, setEmploymentType] = useState("full_time");
  const [locationType, setLocationType] = useState("onsite");
  const [city, setCity] = useState("");
  const [province, setProvince] = useState("ON");
  const [salaryMin, setSalaryMin] = useState("");
  const [salaryMax, setSalaryMax] = useState("");
  const [salaryPeriod, setSalaryPeriod] = useState("yearly");
  const [applicationUrl, setApplicationUrl] = useState("");
  const [applicationEmail, setApplicationEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!authLoading && !user) {
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="font-display text-2xl font-semibold">Sign in to post a job</h1>
        <p className="mt-2 text-sm text-muted-foreground">You need a free Spott account to post a job.</p>
        <Link to="/auth" search={{ next: "/jobs/new" } as any} className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          Sign in
        </Link>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!companyName.trim() || !title.trim()) return toast.error("Add a company name and job title");
    if (locationType !== "remote" && !city.trim()) return toast.error("Add a city, or set location to Remote");

    setSubmitting(true);
    try {
      const { data: job, error } = await supabase
        .from("job_postings")
        .insert({
          user_id: user.id,
          company_name: companyName.trim(),
          title: title.trim(),
          description: description.trim() || null,
          requirements: requirements.trim() || null,
          benefits: benefits.trim() || null,
          employment_type: employmentType,
          location_type: locationType,
          city: locationType === "remote" ? null : city.trim() || null,
          province: locationType === "remote" ? null : province || null,
          salary_min_cents: salaryMin ? Math.round(Number(salaryMin) * 100) : null,
          salary_max_cents: salaryMax ? Math.round(Number(salaryMax) * 100) : null,
          salary_period: salaryPeriod,
          application_url: applicationUrl.trim() || null,
          application_email: applicationEmail.trim() || null,
        } as any)
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Job posted!");
      navigate({ to: "/jobs/$id", params: { id: job.id } });
    } catch (err: any) {
      toast.error(err.message ?? "Could not post job");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to jobs
      </Link>
      <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight">Post a job</h1>
      <p className="mt-1 text-sm text-muted-foreground">Free to post. Reach candidates across Canada.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Company name</label>
            <input className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
          </div>
          <div>
            <label className="text-sm font-medium">Job title</label>
            <input className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" value={title} onChange={(e) => setTitle(e.target.value)} required />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium">Description</label>
          <textarea className="mt-1 w-full resize-y rounded-md border border-border bg-background p-2.5 text-sm" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What's the role? What will they be doing?" />
        </div>
        <div>
          <label className="text-sm font-medium">Requirements</label>
          <textarea className="mt-1 w-full resize-y rounded-md border border-border bg-background p-2.5 text-sm" rows={3} value={requirements} onChange={(e) => setRequirements(e.target.value)} />
        </div>
        <div>
          <label className="text-sm font-medium">Benefits (optional)</label>
          <textarea className="mt-1 w-full resize-y rounded-md border border-border bg-background p-2.5 text-sm" rows={2} value={benefits} onChange={(e) => setBenefits(e.target.value)} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Employment type</label>
            <select className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" value={employmentType} onChange={(e) => setEmploymentType(e.target.value)}>
              {EMPLOYMENT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Location</label>
            <select className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" value={locationType} onChange={(e) => setLocationType(e.target.value)}>
              {LOCATION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
        </div>

        {locationType !== "remote" && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-medium">City</label>
              <input className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" value={city} onChange={(e) => setCity(e.target.value)} required={locationType !== "remote"} />
            </div>
            <div>
              <label className="text-sm font-medium">Province</label>
              <select className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" value={province} onChange={(e) => setProvince(e.target.value)}>
                {PROVINCES.map((p) => <option key={p.code} value={p.code}>{p.name}</option>)}
              </select>
            </div>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-sm font-medium">Salary min</label>
            <input type="number" className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" value={salaryMin} onChange={(e) => setSalaryMin(e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <label className="text-sm font-medium">Salary max</label>
            <input type="number" className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" value={salaryMax} onChange={(e) => setSalaryMax(e.target.value)} placeholder="Optional" />
          </div>
          <div>
            <label className="text-sm font-medium">Period</label>
            <select className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" value={salaryPeriod} onChange={(e) => setSalaryPeriod(e.target.value)}>
              <option value="yearly">Per year</option>
              <option value="hourly">Per hour</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-medium">Application link</label>
            <input className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" value={applicationUrl} onChange={(e) => setApplicationUrl(e.target.value)} placeholder="https://…" />
          </div>
          <div>
            <label className="text-sm font-medium">Or application email</label>
            <input type="email" className="mt-1 w-full rounded-md border border-border bg-background p-2.5 text-sm" value={applicationEmail} onChange={(e) => setApplicationEmail(e.target.value)} placeholder="jobs@yourcompany.com" />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Leave both blank and applicants can apply directly through Spott instead — their application (and cover note) will show up right here for you to review.
        </p>

        <button type="submit" disabled={submitting} className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-3 font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Post job
        </button>
      </form>
    </div>
  );
}
