import { prisma } from "@/lib/db";
import type { JobCardData } from "@/components/jobs/JobCard";

export type RecommendedJob = {
  job: JobCardData;
  overlap: number; // number of the job's required skills the candidate has
  applied: boolean;
};

const RECOMMENDATION_LIMIT = 4;

const jobInclude = {
  company: true,
  skills: { include: { skill: true } },
} as const;

// Skills-based job recommendations for the dashboard.
//
// Ranks OPEN jobs by how many of their required skills the candidate has
// (candidateSkill ⟷ jobSkill via skillId), newest first as a tiebreak, and
// returns the top 4 with a per-job "already applied" flag. Jobs with zero
// overlap are dropped.
//
// Fallback: if the candidate has no skills yet, or nothing overlaps, we return
// the most recent open jobs instead so a brand-new user never sees an empty
// section. Only a genuinely empty job board yields [].
export async function getRecommendedJobs(
  candidateProfileId: string
): Promise<RecommendedJob[]> {
  const [candidateSkills, applications] = await Promise.all([
    prisma.candidateSkill.findMany({
      where: { candidateProfileId },
      select: { skillId: true },
    }),
    prisma.application.findMany({
      where: { candidateProfileId },
      select: { jobId: true },
    }),
  ]);
  const skillIds = candidateSkills.map((s) => s.skillId);
  const appliedJobIds = new Set(applications.map((a) => a.jobId));

  let jobs: JobCardData[] = [];
  let overlapByJob = new Map<string, number>();

  if (skillIds.length > 0) {
    // One grouped query gives overlap counts for every open job that shares
    // at least one skill; then a single findMany hydrates the top 4.
    const grouped = await prisma.jobSkill.groupBy({
      by: ["jobId"],
      where: { skillId: { in: skillIds }, job: { status: "open" } },
      _count: { skillId: true },
    });
    overlapByJob = new Map(grouped.map((g) => [g.jobId, g._count.skillId]));

    if (grouped.length > 0) {
      const candidates = await prisma.job.findMany({
        where: { id: { in: grouped.map((g) => g.jobId) } },
        include: jobInclude,
      });
      candidates.sort((a, b) => {
        const diff =
          (overlapByJob.get(b.id) ?? 0) - (overlapByJob.get(a.id) ?? 0);
        return diff !== 0
          ? diff
          : b.createdAt.getTime() - a.createdAt.getTime();
      });
      jobs = candidates.slice(0, RECOMMENDATION_LIMIT);
    }
  }

  if (jobs.length === 0) {
    jobs = await prisma.job.findMany({
      where: { status: "open" },
      include: jobInclude,
      orderBy: { createdAt: "desc" },
      take: RECOMMENDATION_LIMIT,
    });
  }

  return jobs.map((job) => ({
    job,
    overlap: overlapByJob.get(job.id) ?? 0,
    applied: appliedJobIds.has(job.id),
  }));
}
