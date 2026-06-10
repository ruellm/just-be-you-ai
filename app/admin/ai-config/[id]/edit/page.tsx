import { notFound } from "next/navigation";
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
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <h1 className="text-2xl font-semibold">Edit question set</h1>
      <QuestionSetForm mode="edit" questionSetId={set.id} defaultValues={defaults} />
    </div>
  );
}
