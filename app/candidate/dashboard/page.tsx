import Link from "next/link";
import { Briefcase, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { JobCard } from "@/components/jobs/JobCard";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { getRecommendedJobs } from "@/lib/recommendations";

type ProfileFields = {
  firstName: string | null;
  lastName: string | null;
  country: string | null;
  city: string | null;
  phone: string | null;
  linkedinUrl: string | null;
  expectedSalary: number | null;
  nationality: string | null;
  languages: string[];
  totalYearsExperience: number | null;
  preferredRole: string | null;
  summary: string | null;
  resumeUrl: string | null;
};

// Completion = percent of profile signals filled in: the basic-info fields +
// summary, plus "has at least one" education / skill / work experience.
function completionPercent(
  profile: ProfileFields | null,
  counts: { education: number; skills: number; workExperience: number }
): number {
  if (!profile) return 0;
  const checks: boolean[] = [
    !!profile.firstName,
    !!profile.lastName,
    !!profile.country,
    !!profile.city,
    !!profile.phone,
    !!profile.linkedinUrl,
    profile.expectedSalary != null,
    !!profile.nationality,
    profile.languages.length > 0,
    profile.totalYearsExperience != null,
    !!profile.preferredRole,
    !!profile.summary,
    !!profile.resumeUrl,
    counts.education > 0,
    counts.skills > 0,
    counts.workExperience > 0,
  ];
  const filled = checks.filter(Boolean).length;
  return Math.round((filled / checks.length) * 100);
}

export default async function CandidateDashboardPage() {
  const user = await getCurrentUser();
  const profile = user
    ? await prisma.candidateProfile.findUnique({ where: { userId: user.id } })
    : null;

  const counts = profile
    ? {
        education: await prisma.education.count({
          where: { candidateProfileId: profile.id },
        }),
        skills: await prisma.candidateSkill.count({
          where: { candidateProfileId: profile.id },
        }),
        workExperience: await prisma.workExperience.count({
          where: { candidateProfileId: profile.id },
        }),
      }
    : { education: 0, skills: 0, workExperience: 0 };

  const percent = completionPercent(profile, counts);
  const firstName =
    profile?.firstName || user?.email?.split("@")[0] || "there";

  const recommended = profile ? await getRecommendedJobs(profile.id) : [];

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-6 py-10 font-body lg:px-14 lg:py-14">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-brand-primary sm:text-4xl">
          Welcome back, {firstName}!
        </h1>
        <p className="text-base text-brand-ink-secondary">
          You&apos;re making great progress towards your dream career.
        </p>
      </div>

      {/* Profile Strength */}
      <section className="rounded-[20px] border border-brand-border bg-brand-surface p-6 sm:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="flex min-w-0 flex-1 gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-[12px] bg-brand-primary/10 text-brand-primary">
              <ShieldCheck className="size-6" />
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <div>
                <p className="text-base font-semibold text-brand-ink">
                  Profile Strength
                </p>
                <p className="text-sm text-brand-ink-secondary">
                  Almost there! Complete your profile for better job matches.
                </p>
              </div>
              <div className="flex items-center gap-4">
                {/* Progress bar: two divs (the `progress` primitive isn't installed). */}
                <div
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={percent}
                  aria-label="Profile completion"
                  className="h-3 flex-1 overflow-hidden rounded-[12px] bg-brand-container"
                >
                  <div
                    className="h-full rounded-[12px] bg-brand-primary transition-[width]"
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="shrink-0 text-sm text-brand-ink-secondary">
                  {percent}/100
                </span>
              </div>
            </div>
          </div>
          <Button
            asChild
            className="h-[46px] shrink-0 rounded-[12px] bg-brand-secondary px-6 text-sm font-medium text-white hover:bg-brand-secondary/90"
          >
            <Link href="/candidate/profile">Complete Your Profile</Link>
          </Button>
        </div>
      </section>

      {/* Recommended For You */}
      <section className="space-y-5">
        <h2 className="text-2xl font-semibold text-brand-primary">
          Recommended For You
        </h2>
        {recommended.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="No open jobs right now"
            description="Check back soon — new roles are added regularly."
            className="bg-brand-surface"
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {recommended.map(({ job, applied }) => (
              <JobCard key={job.id} job={job} applied={applied} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
