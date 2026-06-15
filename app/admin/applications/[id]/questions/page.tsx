import { notFound } from "next/navigation";
import type { QuestionCategory } from "@prisma/client";
import { prisma } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { RegenerateButton } from "./RegenerateButton";

const CATEGORY_CLASS: Record<QuestionCategory, string> = {
  core: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  personalized:
    "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300",
  behavioral:
    "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
};

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
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Generated questions</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {candidateName} · {application.job.title} ·{" "}
            {application.job.company.name}
          </p>
          {generatedAt ? (
            <p className="text-muted-foreground text-xs">
              Generated {generatedAt.toLocaleString()}
            </p>
          ) : null}
        </div>
        <RegenerateButton applicationId={application.id} />
      </div>

      {application.questions.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground text-sm">
            No questions have been generated for this application yet (generation
            may have failed, or hasn&apos;t run). Use “Regenerate questions”.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {application.questions.map((q) => (
            <Card key={q.id}>
              <CardContent className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm font-medium">
                    {q.order}.
                  </span>
                  <Badge className={cn("border-transparent", CATEGORY_CLASS[q.category])}>
                    {q.category}
                  </Badge>
                </div>
                <p className="text-sm font-medium">{q.text}</p>
                {q.rationale ? (
                  <p className="text-muted-foreground text-sm">{q.rationale}</p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
