import Link from "next/link";
import { applicationDisplayTitle } from "@/lib/prescreen";
import { notFound } from "next/navigation";
import type { QuestionCategory } from "@prisma/client";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { ProfileSectionCard } from "@/app/candidate/profile/ProfileSectionCard";
import { RegenerateButton } from "./RegenerateButton";

// Admin-only debug view of an application's generated interview questions.
// B7b restyled it to the Figma design; the data, the Regenerate action and the
// admin-only nature are unchanged.

// Section order + display labels for the QuestionCategory enum. The enum maps
// 1:1 to the design's three headers — no remapping, and this is unrelated to
// the rubric's five SCORING categories.
const SECTIONS: { category: QuestionCategory; heading: string }[] = [
  { category: "core", heading: "Core Competencies" },
  { category: "behavioral", heading: "Behavioral" },
  { category: "personalized", heading: "Personalized" },
];

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

      {application.questions.length === 0 ? (
        <ProfileSectionCard>
          <p className="text-small text-brand-ink-secondary">
            No questions have been generated for this application yet
            (generation may have failed, or hasn&apos;t run). Use
            &ldquo;Regenerate questions&rdquo;.
          </p>
        </ProfileSectionCard>
      ) : (
        SECTIONS.map(({ category, heading }) => {
          const questions = application.questions.filter(
            (q) => q.category === category
          );
          // Omit a section with no questions rather than render an empty card.
          if (questions.length === 0) return null;
          return (
            <ProfileSectionCard key={category}>
              <h2 className="text-heading font-semibold text-brand-primary">
                {heading}
              </h2>
              <ol className="space-y-5">
                {questions.map((question, index) => (
                  <li key={question.id} className="flex gap-3">
                    <span className="shrink-0 text-body text-brand-ink-sidebar">
                      {index + 1}.
                    </span>
                    <div className="min-w-0 space-y-1">
                      <p className="text-body text-brand-ink">{question.text}</p>
                      {question.rationale ? (
                        <p className="text-small text-brand-ink-secondary italic">
                          {question.rationale}
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
            </ProfileSectionCard>
          );
        })
      )}
    </div>
  );
}
