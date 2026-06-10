import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";

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

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-8">
      <h1 className="text-2xl font-semibold">Welcome, {user?.email}</h1>

      <Card>
        <CardHeader>
          <CardTitle>Your profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button asChild>
            <Link href="/candidate/profile/basic-info">
              Complete your profile
            </Link>
          </Button>
          <p className="text-muted-foreground text-sm">
            Profile completion: {percent}%
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
