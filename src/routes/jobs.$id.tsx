import { createFileRoute, Link, useNavigate, useParams } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { employmentTypeLabel, locationTypeLabel, fmtSalary, fmtPostedDate } from "@/lib/jobs";
import { ArrowLeft, Briefcase, MapPin, DollarSign, Heart, ExternalLink, Mail, Trash2, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { ShareButton } from "@/components/ShareButton";

export const Route = createFileRoute("/jobs/$id")({
  component: JobDetail,
  loader: async ({ params }) => {
    const { data: job } = await supabase
      .from("job_postings")
      .select("id,title,company_name,description,employment_type,location_type,city,province,salary_min_cents,salary_max_cents,salary_period,status")
      .eq("id", params.id)
      .maybeSingle();
    return { job };
  },
  head: ({ params, loaderData }) => {
    const j = loaderData?.job;
    if (!j || j.status !== "published") {
      return { meta: [{ title: "Job — Spott" }, { name: "robots", content: "noindex,follow" }] };
    }
    const where = j.location_type === "remote" ? "Remote" : [j.city, j.province].filter(Boolean).join(", ") || "Canada";
    const title = `${j.title} at ${j.company_name} — ${where} — Spott Jobs`;
    const rawDesc = j.description?.trim();
    const description = rawDesc ? rawDesc.slice(0, 155) : `${j.title} at ${j.company_name}, ${where}. Apply on Spott.`;
    const url = `https://www.spott.ca/jobs/${params.id}`;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:type", content: "website" },
    ];

    const jsonLd: Record<string, unknown> = {
      "@context": "https://schema.org",
      "@type": "JobPosting",
      title: j.title,
      description: rawDesc || j.title,
      hiringOrganization: { "@type": "Organization", name: j.company_name },
      employmentType: j.employment_type.toUpperCase(),
      jobLocationType: j.location_type === "remote" ? "TELECOMMUTE" : undefined,
      ...(j.location_type !== "remote"
        ? { jobLocation: { "@type": "Place", address: { "@type": "PostalAddress", addressLocality: j.city ?? undefined, addressRegion: j.province ?? undefined, addressCountry: "CA" } } }
        : {}),
      ...(j.salary_min_cents || j.salary_max_cents
        ? {
            baseSalary: {
              "@type": "MonetaryAmount",
              currency: "CAD",
              value: {
                "@type": "QuantitativeValue",
                minValue: j.salary_min_cents ? j.salary_min_cents / 100 : undefined,
                maxValue: j.salary_max_cents ? j.salary_max_cents / 100 : undefined,
                unitText: j.salary_period === "hourly" ? "HOUR" : "YEAR",
              },
            },
          }
        : {}),
    };

    return {
      meta,
      links: [{ rel: "canonical", href: url }],
      scripts: [{ type: "application/ld+json", children: JSON.stringify(jsonLd) }],
    };
  },
});

type JobFull = {
  id: string;
  user_id: string;
  company_name: string;
  title: string;
  description: string | null;
  requirements: string | null;
  benefits: string | null;
  employment_type: string;
  location_type: string;
  city: string | null;
  province: string | null;
  salary_min_cents: number | null;
  salary_max_cents: number | null;
  salary_period: string;
  application_url: string | null;
  application_email: string | null;
  status: string;
  created_at: string;
};

type Applicant = { id: string; applicant_id: string; cover_note: string | null; status: string; created_at: string; profile?: { display_name: string | null } | null };

function JobDetail() {
  const { id } = useParams({ from: "/jobs/$id" });
  const { user } = useAuth();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [favorited, setFavorited] = useState(false);
  const [applied, setApplied] = useState(false);
  const [coverNote, setCoverNote] = useState("");
  const [applying, setApplying] = useState(false);
  const [showApplyForm, setShowApplyForm] = useState(false);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data: j } = await supabase
        .from("job_postings")
        .select("id,user_id,company_name,title,description,requirements,benefits,employment_type,location_type,city,province,salary_min_cents,salary_max_cents,salary_period,application_url,application_email,status,created_at,view_count")
        .eq("id", id)
        .maybeSingle();
      if (cancel) return;
      setJob(j as JobFull | null);
      if (j) supabase.from("job_postings").update({ view_count: ((j as any).view_count || 0) + 1 }).eq("id", id);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [id]);

  useEffect(() => {
    if (!user || !job) return;
    supabase.from("job_favorites").select("id").eq("user_id", user.id).eq("job_id", id).maybeSingle().then(({ data }) => setFavorited(!!data));
    supabase.from("job_applications").select("id").eq("applicant_id", user.id).eq("job_id", id).maybeSingle().then(({ data }) => setApplied(!!data));
    if (job.user_id === user.id) {
      supabase
        .from("job_applications")
        .select("id,applicant_id,cover_note,status,created_at,profiles(display_name)")
        .eq("job_id", id)
        .order("created_at", { ascending: false })
        .then(({ data }) => setApplicants(((data ?? []) as any[]).map((a) => ({ ...a, profile: a.profiles })) as Applicant[]));
    }
  }, [user, job, id]);

  const toggleFav = async () => {
    if (!user) return toast.error("Sign in to save jobs");
    if (favorited) {
      await supabase.from("job_favorites").delete().eq("user_id", user.id).eq("job_id", id);
      setFavorited(false);
    } else {
      await supabase.from("job_favorites").insert({ user_id: user.id, job_id: id });
      setFavorited(true);
    }
  };

  const submitApplication = async () => {
    if (!user) return toast.error("Sign in to apply");
    setApplying(true);
    const { error } = await supabase.from("job_applications").insert({ job_id: id, applicant_id: user.id, cover_note: coverNote.trim() || null });
    setApplying(false);
    if (error) return toast.error(error.message);
    setApplied(true);
    setShowApplyForm(false);
    toast.success("Application sent!");
  };

  const updateApplicantStatus = async (appId: string, status: string) => {
    await supabase.from("job_applications").update({ status }).eq("id", appId);
    setApplicants((prev) => prev.map((a) => (a.id === appId ? { ...a, status } : a)));
  };

  const removeJob = async () => {
    if (!job || !confirm("Delete this job posting permanently?")) return;
    setDeleting(true);
    const { error } = await supabase.from("job_postings").delete().eq("id", job.id);
    setDeleting(false);
    if (error) return toast.error(error.message);
    toast.success("Job deleted");
    navigate({ to: "/jobs" });
  };

  if (loading) return <div className="p-8 text-center text-sm text-muted-foreground">Loading…</div>;
  if (!job) return <div className="p-8 text-center text-sm text-muted-foreground">Job not found.</div>;

  const isOwner = user?.id === job.user_id;
  const where = job.location_type === "remote" ? "Remote" : [job.city, job.province].filter(Boolean).join(", ") || "Location TBA";
  const hasExternalApply = !!(job.application_url || job.application_email);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <Link to="/jobs" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Back to jobs
      </Link>

      {job.status !== "published" && (
        <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-800">
          This job is {job.status} — only visible to you{isOwner ? "" : " and the employer"}.
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-border bg-card p-6">
        <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold uppercase tracking-wide">
          {employmentTypeLabel(job.employment_type)}
        </span>
        <h1 className="mt-2 font-display text-2xl font-semibold tracking-tight">{job.title}</h1>
        <p className="mt-1 text-base text-muted-foreground">{job.company_name}</p>

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4" /> {locationTypeLabel(job.location_type)}{where !== "Remote" ? ` · ${where}` : ""}</span>
          <span className="inline-flex items-center gap-1"><DollarSign className="h-4 w-4" /> {fmtSalary(job.salary_min_cents, job.salary_max_cents, job.salary_period)}</span>
          <span className="inline-flex items-center gap-1"><Briefcase className="h-4 w-4" /> {fmtPostedDate(job.created_at)}</span>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          {hasExternalApply ? (
            job.application_url ? (
              <a href={job.application_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2.5 font-semibold text-primary-foreground hover:bg-primary/90">
                <ExternalLink className="h-4 w-4" /> Apply now
              </a>
            ) : (
              <a href={`mailto:${job.application_email}`} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2.5 font-semibold text-primary-foreground hover:bg-primary/90">
                <Mail className="h-4 w-4" /> Apply by email
              </a>
            )
          ) : isOwner ? null : applied ? (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-primary bg-primary/10 px-4 py-2.5 font-semibold text-primary">Application sent ✓</span>
          ) : (
            <button onClick={() => setShowApplyForm((v) => !v)} className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2.5 font-semibold text-primary-foreground hover:bg-primary/90">
              Apply through Spott
            </button>
          )}
          <button onClick={toggleFav} className="inline-flex items-center gap-1.5 rounded-md border border-border px-4 py-2.5 text-sm hover:bg-accent/10">
            <Heart className={`h-4 w-4 ${favorited ? "fill-red-500 text-red-500" : ""}`} />
            {favorited ? "Saved" : "Save"}
          </button>
          <ShareButton url={`/jobs/${job.id}`} title={`${job.title} at ${job.company_name}`} />
          {isOwner && (
            <button onClick={removeJob} disabled={deleting} className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 disabled:opacity-50">
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          )}
        </div>

        {showApplyForm && !hasExternalApply && !isOwner && (
          <div className="mt-4 rounded-xl border border-border bg-secondary/40 p-4">
            <label className="text-sm font-medium">Cover note (optional)</label>
            <textarea className="mt-1 w-full resize-y rounded-md border border-border bg-background p-2.5 text-sm" rows={4} value={coverNote} onChange={(e) => setCoverNote(e.target.value)} placeholder="Tell them why you're a good fit…" />
            <button onClick={submitApplication} disabled={applying} className="mt-2 inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Send application
            </button>
          </div>
        )}

        {job.description && (
          <section className="mt-6">
            <h2 className="font-semibold">About this role</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{job.description}</p>
          </section>
        )}
        {job.requirements && (
          <section className="mt-5">
            <h2 className="font-semibold">Requirements</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{job.requirements}</p>
          </section>
        )}
        {job.benefits && (
          <section className="mt-5">
            <h2 className="font-semibold">Benefits</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-foreground/90">{job.benefits}</p>
          </section>
        )}
      </div>

      {isOwner && !hasExternalApply && (
        <div className="mt-6 rounded-2xl border border-border bg-card p-6">
          <h2 className="flex items-center gap-1.5 font-semibold"><Users className="h-4 w-4" /> Applicants ({applicants.length})</h2>
          {applicants.length === 0 ? (
            <p className="mt-2 text-sm text-muted-foreground">No applications yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border">
              {applicants.map((a) => (
                <li key={a.id} className="py-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">{a.profile?.display_name || "Applicant"}</span>
                    <select value={a.status} onChange={(e) => updateApplicantStatus(a.id, e.target.value)} className="rounded-md border border-border bg-background p-1.5 text-xs">
                      <option value="submitted">Submitted</option>
                      <option value="reviewed">Reviewed</option>
                      <option value="accepted">Accepted</option>
                      <option value="rejected">Rejected</option>
                    </select>
                  </div>
                  {a.cover_note && <p className="mt-1.5 whitespace-pre-wrap text-xs text-muted-foreground">{a.cover_note}</p>}
                  <div className="mt-1 text-[10px] text-muted-foreground">{new Date(a.created_at).toLocaleString()}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
