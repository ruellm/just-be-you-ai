import Link from "next/link";
import { applicationDisplayTitle } from "@/lib/prescreen";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { GeneratedQuestions } from "@/components/applications/GeneratedQuestions";
import { RegenerateButton } from "./RegenerateButton";

// Admin-only debug view of an application's generated interview questions,
// with the Regenerate action. The sections themselves are the shared
// GeneratedQuestions component, also used by the business view.

export default async function GeneratedQuestionsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const application = await prisma.application.findUnique({
    where: { id },
    include: {
      candidateProfile: {
        select: {
          // userId drives the "Back to Previous" target — this page is only
          // ever reached from /admin/users/[userId].
          userId: true,
          firstName: true,
          lastName: true,
          user: { select: { email: true } },
        },
      },
      job: { select: { title: true, company: { select: { name: true } } } },
      questions: { orderBy: { order: "asc" } },
    },
  });
  if (!application) notFound();

  const candidateName =
    [application.candidateProfile.firstName, application.candidateProfile.lastName]
      .filter(Boolean)
      .join(" ") || application.candidateProfile.user.email;
  const generatedAt = application.questions[0]?.createdAt;

  return (
    <div className="space-y-6 px-6 py-8 font-body lg:px-14">
      <Link
        href={`/admin/users/${application.candidateProfile.userId}`}
        className="inline-flex items-center gap-2 text-subheading font-semibold tracking-[-0.96px] text-brand-primary hover:underline"
      >
        <ArrowLeft className="size-5" /> Back to Previous
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <h1 className="text-section font-semibold text-brand-primary">
            Generated Questions
          </h1>
          <p className="text-small text-brand-ink-secondary">
            {candidateName} · {applicationDisplayTitle(application)}
            {application.job ? ` · ${application.job.company.name}` : ""}
          </p>
          {generatedAt ? (
            <p className="text-meta text-brand-ink-secondary">
              Generated {generatedAt.toLocaleString()}
            </p>
          ) : null}
        </div>
        <RegenerateButton applicationId={application.id} />
      </div>

      <GeneratedQuestions
        questions={application.questions}
        emptyMessage="No questions have been generated for this application yet (generation may have failed, or hasn't run). Use “Regenerate questions”."
      />
    </div>
  );
}
