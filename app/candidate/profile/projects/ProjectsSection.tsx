"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { FolderKanban, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/EmptyState";
import { Dialog } from "@/components/ui/dialog";
import { FormModalContent } from "@/components/profile/FormModal";
import { ConfirmDelete } from "@/components/profile/ConfirmDelete";
import type { SkillOption } from "@/components/profile/SkillCombobox";
import { displayDateRange } from "@/lib/profile-format";
import { cn } from "@/lib/utils";
import {
  BTN_DANGER,
  BTN_INK,
  BTN_PRIMARY,
  INSET_PANEL,
  ProfileSectionHeader,
} from "../ProfileSectionCard";
import { ProjectForm } from "./ProjectForm";
import { deleteProject } from "./actions";

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

// Standalone Projects section (profile redesign P3). Projects belong to the
// candidate profile directly — personal / academic / freelance work.
export function ProjectsSection({
  projects,
  skillOptions,
  title,
  subtitle,
}: {
  projects: ProjectDTO[];
  skillOptions: SkillOption[];
  title?: string;
  subtitle?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectDTO | null>(null);

  function openAdd() {
    setEditing(null);
    setOpen(true);
  }
  function openEdit(p: ProjectDTO) {
    setEditing(p);
    setOpen(true);
  }
  function handleSuccess() {
    setOpen(false);
    router.refresh();
  }

  const addButton = (
    <Button className={BTN_PRIMARY} onClick={openAdd}>
      <Plus /> Add Project
    </Button>
  );

  return (
    <div className="space-y-6 font-body">
      {title && subtitle ? (
        <ProfileSectionHeader title={title} subtitle={subtitle} action={addButton} />
      ) : (
        <div className="flex justify-end">{addButton}</div>
      )}

      {/* Add / edit dialog — ProjectForm internals untouched (P4) */}
      <Dialog open={open} onOpenChange={setOpen}>
        <FormModalContent
          icon={FolderKanban}
          title={editing ? "Edit Project" : "Add Project"}
        >
          <ProjectForm
            key={editing?.id ?? "new"}
            project={editing}
            skillOptions={skillOptions}
            onSuccess={handleSuccess}
          />
        </FormModalContent>
      </Dialog>

      {projects.length === 0 ? (
        <EmptyState
          icon={FolderKanban}
          title="No projects added yet"
          description="Add personal, academic, or freelance projects that showcase your skills."
          action={
            <Button className={BTN_PRIMARY} onClick={openAdd}>
              <Plus /> Add Project
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {projects.map((p) => {
            const range = displayDateRange(p.startDate, p.endDate, p.ongoing);
            return (
              <div
                key={p.id}
                className={cn(
                  INSET_PANEL,
                  "flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-start sm:justify-between"
                )}
              >
                <div className="min-w-0 space-y-1">
                  <p className="text-body font-semibold text-brand-ink">{p.name}</p>
                  {p.url ? (
                    <p className="text-small text-brand-ink-secondary">
                      URL:{" "}
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="break-all underline hover:text-brand-primary"
                      >
                        {p.url}
                      </a>
                    </p>
                  ) : null}
                  {range ? (
                    <p className="text-small text-brand-ink-secondary">{range}</p>
                  ) : null}
                  {p.description ? (
                    <p className="pt-1 text-small whitespace-pre-line text-brand-ink-secondary">
                      {p.description}
                    </p>
                  ) : null}
                  {p.skillNames.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {p.skillNames.map((name) => (
                        <span
                          key={name}
                          className="inline-flex h-[21px] items-center rounded-[6px] bg-tag-1 px-2 text-meta text-brand-ink"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button className={BTN_INK} onClick={() => openEdit(p)}>
                    <Pencil /> Edit
                  </Button>
                  <ConfirmDelete
                    onConfirm={() => deleteProject(p.id)}
                    title="Delete this project?"
                    successMessage="Project deleted"
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
