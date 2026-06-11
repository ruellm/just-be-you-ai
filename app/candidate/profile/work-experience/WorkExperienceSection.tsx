"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SkillOption } from "@/components/profile/SkillCombobox";
import type { EmploymentTypeValue } from "../schemas";
import { WorkExperienceForm } from "./WorkExperienceForm";
import { WorkExperienceCard } from "./WorkExperienceCard";

export type ProjectDTO = {
  id: string;
  name: string;
  url: string;
  startDate: string;
  endDate: string;
  ongoing: boolean;
  description: string;
  skillIds: string[];
  skillNames: string[];
};

export type WorkExperienceDTO = {
  id: string;
  position: string;
  companyName: string;
  startDate: string;
  endDate: string;
  currentlyWorking: boolean;
  employmentType: EmploymentTypeValue;
  description: string;
  projects: ProjectDTO[];
};

export function WorkExperienceSection({
  experiences,
  skillOptions,
}: {
  experiences: WorkExperienceDTO[];
  skillOptions: SkillOption[];
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

  return (
    <div className="space-y-4">
      <Button onClick={openAdd}>
        <Plus /> Add work experience
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing ? "Edit work experience" : "Add work experience"}
            </DialogTitle>
          </DialogHeader>
          <WorkExperienceForm
            key={editing?.id ?? "new"}
            entry={editing}
            onSuccess={handleSuccess}
          />
        </DialogContent>
      </Dialog>

      {experiences.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No work experience added yet"
          description="Add roles you've held and the projects you worked on."
          action={
            <Button variant="outline" onClick={openAdd}>
              <Plus /> Add work experience
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {experiences.map((w) => (
            <WorkExperienceCard
              key={w.id}
              experience={w}
              skillOptions={skillOptions}
              onEdit={() => openEdit(w)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
