import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { QuestionSetForm } from "../../QuestionSetForm";
import { VERTICALS, type QuestionSetValues } from "../../schemas";

export default async function EditQuestionSetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const set = await prisma.questionSet.findUnique({
    where: { id },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!set) notFound();

  const vertical = (
    VERTICALS as readonly string[]
  ).includes(set.vertical)
    ? (set.vertical as QuestionSetValues["vertical"])
    : "General";

  const defaults: QuestionSetValues = {
    name: set.name,
    vertical,
    description: set.description ?? "",
    questions: set.questions.map((q) => ({ text: q.text })),
  };

  return (
    <div className="space-y-6 px-6 py-8 font-body lg:px-14">
      <Link
        href="/admin/ai-config"
        className="inline-flex items-center gap-2 text-xl font-semibold tracking-[-0.5px] text-brand-primary hover:underline"
      >
        <ArrowLeft className="size-5" /> Back to AI Config
      </Link>
      <div className="border-b border-brand-border pb-5">
        <h1 className="text-4xl leading-8 font-semibold tracking-[-0.5px] text-brand-primary">
          Edit Question Set
        </h1>
        <p className="mt-3 text-base text-brand-ink-secondary">
          This module generates specialized assessment questions tailored to
          evaluate candidates.
        </p>
      </div>
      <QuestionSetForm mode="edit" questionSetId={set.id} defaultValues={defaults} />
    </div>
  );
}
