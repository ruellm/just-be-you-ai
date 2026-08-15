"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { Dialog } from "@/components/ui/dialog";
import { FormModalContent } from "@/components/profile/FormModal";
import type { EmploymentTypeValue } from "../schemas";
import { BTN_PRIMARY, ProfileSectionHeader } from "../ProfileSectionCard";
import { WorkExperienceForm } from "./WorkExperienceForm";
import { WorkExperienceCard } from "./WorkExperienceCard";

export type WorkExperienceDTO = {
  id: string;
  position: string;
  companyName: string;
  startDate: string;
  endDate: string;
  currentlyWorking: boolean;
  employmentType: EmploymentTypeValue;
  description: string;
};

// `title`/`subtitle`: when given, the section renders its own header row so
// the "Add Work Experience" button can sit top-right of the card.
export function WorkExperienceSection({
  experiences,
  title,
  subtitle,
}: {
  experiences: WorkExperienceDTO[];
  title?: string;
  subtitle?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<WorkExperienceDTO | null>(null);

  function openAdd() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(entry: WorkExperienceDTO) {
    setEditing(entry);
    setOpen(true);
  }
  function handleSuccess() {
    setOpen(false);
    router.refresh();
  }

  const addButton = (
    <Button className={BTN_PRIMARY} onClick={openAdd}>
      <Plus /> Add Work Experience
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
          icon={Briefcase}
          title={editing ? "Edit Work Experience" : "Add Work Experience"}
        >
          <WorkExperienceForm
            key={editing?.id ?? "new"}
            entry={editing}
            onSuccess={handleSuccess}
          />
        </FormModalContent>
      </Dialog>

      {experiences.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No work experience added yet"
          description="Add the professional roles you've held and your key responsibilities."
          action={
            <Button className={BTN_PRIMARY} onClick={openAdd}>
              <Plus /> Add Work Experience
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {experiences.map((w) => (
            <WorkExperienceCard
              key={w.id}
              experience={w}
              onEdit={() => openEdit(w)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
