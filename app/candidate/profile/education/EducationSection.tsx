"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GraduationCap, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { cn } from "@/lib/utils";
import { displayDateRange } from "@/lib/profile-format";
import {
  BTN_DANGER,
  BTN_INK,
  BTN_PRIMARY,
  INSET_PANEL,
  ProfileSectionHeader,
} from "../ProfileSectionCard";
import { Dialog } from "@/components/ui/dialog";
import { FormModalContent } from "@/components/profile/FormModal";
import { ConfirmDelete } from "@/components/profile/ConfirmDelete";
import { EducationForm } from "./EducationForm";
import { deleteEducation } from "./actions";

export type EducationDTO = {
  id: string;
  school: string;
  country: string;
  degree: string;
  fieldOfStudy: string;
  startDate: string;
  endDate: string;
  currentlyStudying: boolean;
};

function dateRange(e: EducationDTO): string {
  return displayDateRange(e.startDate, e.endDate, e.currentlyStudying);
}

// `title`/`subtitle`: when given, the section renders its own header row so
// the "Add Education" button can sit top-right of the card.
export function EducationSection({
  educations,
  title,
  subtitle,
}: {
  educations: EducationDTO[];
  title?: string;
  subtitle?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EducationDTO | null>(null);

  function openAdd() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(entry: EducationDTO) {
    setEditing(entry);
    setOpen(true);
  }
  function handleSuccess() {
    setOpen(false);
    router.refresh();
  }

  const addButton = (
    <Button className={BTN_PRIMARY} onClick={openAdd}>
      <Plus /> Add Education
    </Button>
  );

  return (
    <div className="space-y-6 font-body">
      {title && subtitle ? (
        <ProfileSectionHeader title={title} subtitle={subtitle} action={addButton} />
      ) : (
        <div className="flex justify-end">{addButton}</div>
      )}

      {/* Add / edit dialog — internals untouched (P4) */}
      <Dialog open={open} onOpenChange={setOpen}>
        <FormModalContent
          icon={GraduationCap}
          title={editing ? "Edit Education" : "Add Education"}
        >
          <EducationForm
            key={editing?.id ?? "new"}
            entry={editing}
            onSuccess={handleSuccess}
          />
        </FormModalContent>
      </Dialog>

      {educations.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No education added yet"
          description="Add your schools, degrees, and fields of study."
          action={
            <Button className={BTN_PRIMARY} onClick={openAdd}>
              <Plus /> Add Education
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {educations.map((e) => {
            const detail = [e.degree, e.fieldOfStudy].filter(Boolean).join(", ");
            const range = dateRange(e);
            return (
              <div
                key={e.id}
                className={cn(
                  INSET_PANEL,
                  "flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
                )}
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-body font-semibold text-brand-ink">{e.school}</p>
                  {detail ? (
                    <p className="text-small text-brand-ink-secondary">{detail}</p>
                  ) : null}
                  {e.country || range ? (
                    <p className="flex flex-wrap items-center gap-2 text-small text-brand-ink-secondary">
                      {e.country ? <span>{e.country}</span> : null}
                      {e.country && range ? (
                        <span
                          aria-hidden
                          className="size-1 rounded-full bg-brand-ink-secondary"
                        />
                      ) : null}
                      {range ? <span>{range}</span> : null}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button className={BTN_INK} onClick={() => openEdit(e)}>
                    <Pencil /> Edit
                  </Button>
                  <ConfirmDelete
                    onConfirm={() => deleteEducation(e.id)}
                    successMessage="Education deleted"
                    trigger={
                      <Button className={BTN_DANGER}>
                        <Trash2 /> Delete
                      </Button>
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
