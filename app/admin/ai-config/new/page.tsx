import { QuestionSetForm } from "../QuestionSetForm";
import type { QuestionSetValues } from "../schemas";

const EMPTY: QuestionSetValues = {
  name: "",
  vertical: "General",
  description: "",
  questions: [{ text: "" }],
};

export default function NewQuestionSetPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-6 py-8">
      <h1 className="text-2xl font-semibold">New question set</h1>
      <QuestionSetForm mode="create" defaultValues={EMPTY} />
    </div>
  );
}
