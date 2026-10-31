import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { applicationDisplayTitle } from "@/lib/prescreen";
import { GeneratedQuestions } from "@/components/applications/GeneratedQuestions";
import { unlockedApplicationAccess } from "../unlocked-access";

// Business view of an application's generated interview questions. Same
// access as the transcript (company owns the job, candidate unlocked); no
// regenerate here.
export default async function BusinessGeneratedQuestionsPage({
  params,
}: {
  params: Promise<{ candidateProfileId: string; applicationId: string }>;
}) {
  const { candidateProfileId, applicationId } = await params;
  const access = await unlockedApplicationAccess(candidateProfileId, applicationId);
  if (!access) notFound();

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: {
      candidateProfile: {
        select: {
          firstName: true,
          lastName: true,
          user: { select: { email: true } },
        },
      },
      job: { select: { title: true } },
      questions: { orderBy: { order: "asc" } },
    },
  });
  if (!application) notFound();

  const candidateName =
    [application.candidateProfile.firstName, application.candidateProfile.lastName]
      .filter(Boolean)
      .join(" ") || application.candidateProfile.user.email;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-6 py-10 font-body lg:px-14 lg:py-14">
      <Link
        href={`/business/candidates/${candidateProfileId}`}
        className="inline-flex items-center gap-2 text-subheading font-semibold tracking-[-0.96px] text-brand-primary hover:underline"
      >
        <ArrowLeft className="size-5" /> Back to Previous
      </Link>

      <div className="space-y-1">
        <h1 className="text-page-title font-semibold tracking-[-0.5px] text-brand-primary">
          Generated Questions
        </h1>
        <p className="text-small text-brand-ink-secondary">
          {candidateName} · {applicationDisplayTitle(application)}
        </p>
      </div>

      <GeneratedQuestions
        questions={application.questions}
        emptyMessage="No questions were generated for this interview."
      />
    </div>
  );
}
