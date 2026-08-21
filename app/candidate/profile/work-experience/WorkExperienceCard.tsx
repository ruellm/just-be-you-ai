"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ConfirmDelete } from "@/components/profile/ConfirmDelete";
import { displayDateRange } from "@/lib/profile-format";
import { cn } from "@/lib/utils";
import { EMPLOYMENT_TYPE_LABELS } from "../schemas";
import { BTN_DANGER, BTN_INK, INSET_PANEL } from "../ProfileSectionCard";
import { deleteWorkExperience } from "./actions";
import type { WorkExperienceDTO } from "./WorkExperienceSection";

// One work-experience entry row. Projects are no longer nested here — they
// are a standalone profile section (see ../projects).
export function WorkExperienceCard({
  experience,
  onEdit,
}: {
  experience: WorkExperienceDTO;
  onEdit: () => void;
}) {
  const range = displayDateRange(
    experience.startDate,
    experience.endDate,
    experience.currentlyWorking
  );

  return (
    <div
      className={cn(
        INSET_PANEL,
        "flex flex-col gap-4 px-5 py-4 font-body sm:flex-row sm:items-start sm:justify-between"
      )}
    >
      <div className="min-w-0 space-y-1">
        <p className="text-body font-semibold text-brand-ink">{experience.position}</p>
        <p className="flex flex-wrap items-center gap-2 text-small text-brand-ink-secondary">
          <span>{experience.companyName}</span>
          <span aria-hidden className="size-1 rounded-full bg-brand-ink-secondary" />
          <span>{EMPLOYMENT_TYPE_LABELS[experience.employmentType]}</span>
        </p>
        {range ? (
          <p className="text-small text-brand-ink-secondary">{range}</p>
        ) : null}
        {experience.description ? (
          <p className="pt-1 text-small whitespace-pre-line text-brand-ink-secondary">
            {experience.description}
          </p>
        ) : null}
      </div>
      <div className="flex shrink-0 gap-2">
        <Button className={BTN_INK} onClick={onEdit}>
          <Pencil /> Edit
        </Button>
        <ConfirmDelete
          onConfirm={() => deleteWorkExperience(experience.id)}
          title="Delete this work experience?"
          description="This cannot be undone."
          successMessage="Work experience deleted"
          trigger={
            <Button className={BTN_DANGER}>
              <Trash2 /> Delete
            </Button>
          }
        />
      </div>
    </div>
  );
}
