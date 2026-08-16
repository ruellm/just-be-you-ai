import Link from "next/link";
import { ClipboardList, Pencil, Plus, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { formatLongDate } from "@/lib/dates";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/profile/ConfirmDelete";
import { EmptyState } from "@/components/EmptyState";
import {
  BTN_DANGER,
  BTN_INK,
  BTN_PRIMARY,
} from "@/app/candidate/profile/ProfileSectionCard";
import { deleteQuestionSet } from "./actions";

export default async function AiConfigPage() {
  const sets = await prisma.questionSet.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { questions: true } } },
  });

  return (
    <div className="space-y-6 px-6 py-8 font-body lg:px-14">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-brand-border pb-5">
        <div>
          <h1 className="text-4xl leading-8 font-semibold tracking-[-0.5px] text-brand-primary">
            AI Configuration
          </h1>
          <p className="mt-3 text-base text-brand-ink-secondary">
            These question sets will power the AI interview in Phase 2.
          </p>
        </div>
        <Button asChild className={BTN_PRIMARY}>
          <Link href="/admin/ai-config/new">
            <Plus className="size-5" /> Create Question Set
          </Link>
        </Button>
      </div>

      {sets.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No question sets yet"
          description="No custom questions have been configured for this module."
          className="border-0 bg-transparent py-6"
          action={
            <Button asChild className={`${BTN_PRIMARY} h-12 px-6 text-base`}>
              <Link href="/admin/ai-config/new">Create Question Set</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          {sets.map((set) => (
            <div
              key={set.id}
              className="rounded-[12px] border border-brand-border bg-brand-surface p-6 sm:p-8"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="text-xl font-semibold text-brand-primary">
                      {set.name}
                    </h2>
                    <span className="rounded-full bg-status-success px-3 py-0.5 text-xs font-medium text-accent-3">
                      {set.vertical}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-brand-ink-secondary">
                    Created on {formatLongDate(set.createdAt)}
                    <span className="mx-1.5">•</span>
                    {set._count.questions}{" "}
                    {set._count.questions === 1 ? "question" : "questions"}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button asChild className={BTN_INK}>
                    <Link href={`/admin/ai-config/${set.id}/edit`}>
                      <Pencil className="size-4" /> Edit
                    </Link>
                  </Button>
                  <ConfirmDelete
                    onConfirm={deleteQuestionSet.bind(null, set.id)}
                    title="Are you sure?"
                    description={
                      <>
                        This action cannot be undone. All questions associated
                        with{" "}
                        <span className="font-semibold">
                          &quot;{set.name}&quot;
                        </span>{" "}
                        will be permanently removed.
                      </>
                    }
                    confirmLabel="Delete Question Set"
                    successMessage="Question set deleted"
                    trigger={
                      <Button type="button" className={BTN_DANGER}>
                        <Trash2 className="size-4" /> Delete
                      </Button>
                    }
                  />
                </div>
              </div>
              {set.description ? (
                <p className="mt-4 text-base leading-6 text-brand-ink">
                  {set.description}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
