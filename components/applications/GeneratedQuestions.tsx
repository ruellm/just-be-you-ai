import type { QuestionCategory } from "@prisma/client";
import { ProfileSectionCard } from "@/app/candidate/profile/ProfileSectionCard";

// The three question sections shared by the admin and business "Generated
// Questions" pages. The QuestionCategory enum maps 1:1 to the headers; this is
// unrelated to the rubric's five scoring categories.

export type GeneratedQuestionItem = {
  id: string;
  category: QuestionCategory;
  text: string;
  rationale: string | null;
};

const SECTIONS: { category: QuestionCategory; heading: string }[] = [
  { category: "core", heading: "Core Competencies" },
  { category: "behavioral", heading: "Behavioral" },
  { category: "personalized", heading: "Personalized" },
];

export function GeneratedQuestions({
  questions,
  emptyMessage,
}: {
  questions: GeneratedQuestionItem[];
  emptyMessage: string;
}) {
  if (questions.length === 0) {
    return (
      <ProfileSectionCard>
        <p className="text-small text-brand-ink-secondary">{emptyMessage}</p>
      </ProfileSectionCard>
    );
  }

  return (
    <>
      {SECTIONS.map(({ category, heading }) => {
        const items = questions.filter((q) => q.category === category);
        if (items.length === 0) return null;
        return (
          <ProfileSectionCard key={category}>
            <h2 className="text-heading font-semibold text-brand-primary">
              {heading}
            </h2>
            <ol className="space-y-5">
              {items.map((question, index) => (
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
      })}
    </>
  );
}
