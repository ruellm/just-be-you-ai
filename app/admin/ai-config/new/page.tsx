import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
    <div className="space-y-6 px-6 py-8 font-body lg:px-14">
      <Link
        href="/admin/ai-config"
        className="inline-flex items-center gap-2 text-subheading font-semibold tracking-[-0.5px] text-brand-primary hover:underline"
      >
        <ArrowLeft className="size-5" /> Back to AI Config
      </Link>
      <div className="border-b border-brand-border pb-5">
        <h1 className="text-page-title font-semibold tracking-[-0.5px] text-brand-primary">
          Create a Question Set
        </h1>
        <p className="mt-3 text-body text-brand-ink-secondary">
          This module generates specialized assessment questions tailored to
          evaluate candidates.
        </p>
      </div>
      <QuestionSetForm mode="create" defaultValues={EMPTY} />
    </div>
  );
}
